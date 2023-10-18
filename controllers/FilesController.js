import { tmpdir } from 'os';
// import { ObjectId } from 'mongodb';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import {
  mkdir, writeFile, stat, existsSync, realpath,
} from 'fs';
import { join as joinPath } from 'path';
import { contentType } from 'mime-types';
import Queue from 'bull/lib/queue';
import mongoDBCore from 'mongodb/lib/core';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const MAX_FILES_PER_PAGE = 20;
const ROOT_FOLDER_ID = 0;
const acceptedType = { folder: 'folder', file: 'file', image: 'image' };
const NULL_ID = Buffer.alloc(24, '0').toString('utf-8');
const DEFAULT_ROOT_FOLDER = 'files_manager';
const mkDirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const statAsync = promisify(stat);
const realpathAsync = promisify(realpath);
const fileQueue = new Queue('generating-thumbnails');
const isValidId = (id) => {
  const size = 24;
  let i = 0;
  const charRanges = [
    [48, 57], // 0 - 9
    [97, 102], // a - f
    [65, 70], // A - F
  ];
  if (typeof id !== 'string' || id.length !== size) {
    return false;
  }
  while (i < size) {
    const c = id[i];
    const code = c.charCodeAt(0);
    if (!charRanges.some((range) => code >= range[0] && code <= range[1])) {
      return false;
    }
    i += 1;
  }
  return true;
};

export default class FilesController {
  /**
   * Uploads a file
   * @param {req} Request, the express request object
   * @param {res} Result, the express result object.
   */
  static async postUpload(req, res) {
    const xToken = req.header('X-Token');
    if (!xToken) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const key = `auth_${xToken}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    // const userObj = await (await dbClient.usersCollection()).findOne({ _id: ObjectId(userId) });
    const name = req.body ? req.body.name : null;
    const type = req.body ? req.body.type : null;
    const parentId = req.body && req.body.parentId ? req.body.parentId : ROOT_FOLDER_ID;
    const isPublic = req.body && req.body.isPublic ? req.body.isPublic : false;
    const data = req.body && req.body.data ? req.body.data : '';
    if (!name) {
      return res.status(400).send({ error: 'Missing name' });
    }
    if (!type || !Object.values(acceptedType).includes(type)) {
      return res.status(400).send({ error: 'Missing type' });
    }
    if (!data && type !== acceptedType.folder) {
      return res.status(400).send({ error: 'Missing data' });
    }
    if ((parentId !== ROOT_FOLDER_ID && parentId !== ROOT_FOLDER_ID.toString())) {
      const file = await (await dbClient.filesCollection())
        .findOne({
          _id: new mongoDBCore.BSON.ObjectId(isValidId(parentId) ? parentId : NULL_ID),
        });
      if (!file) {
        return res.status(400).send({ error: 'Parent not found' });
      }
      if (file.type !== acceptedType.folder) {
        return res.status(400).send({ error: 'Parent is not a folder' });
      }
    }
    const baseDir = `${process.env.FOLDER_PATH || ''}`.trim().length > 0
      ? process.env.FOLDER_PATH.trim()
      : joinPath(tmpdir(), DEFAULT_ROOT_FOLDER);

    const newFile = {
      userId: new mongoDBCore.BSON.ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: (parentId === ROOT_FOLDER_ID) || (parentId === ROOT_FOLDER_ID.toString())
        ? '0'
        : new mongoDBCore.BSON.ObjectId(parentId),
    };
    await mkDirAsync(baseDir, { recursive: true });
    if (type !== acceptedType.folder) {
      const localPath = joinPath(baseDir, uuidv4());
      // Decode Base64 and write it to the local file
      const decodedData = Buffer.from(data, 'base64');
      await writeFileAsync(localPath, decodedData);
      newFile.localPath = localPath;
    }
    const insertInfo = await (await dbClient.filesCollection())
      .insertOne(newFile);
    const fileId = insertInfo.insertedId.toString();
    if (type === acceptedType.image) {
      const jobName = `Image thumbnail [${userId}-${fileId}]`;
      fileQueue.add({ userId, fileId, name: jobName });
    }
    return res.status(201).json({
      id: fileId,
      userId,
      name,
      type,
      isPublic,
      parentId: (parentId === ROOT_FOLDER_ID) || (parentId === ROOT_FOLDER_ID.toString())
        ? 0
        : parentId,
    });
  }

  /**
  * retrieve the file document based on the ID
  * @param {req} The express request object
  * @param {res} The express response object
  */
  static async getShow(req, res) {
    const xToken = req.header('X-Token');
    if (!xToken) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const key = `auth_${xToken}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const id = req.params ? req.params.id : NULL_ID;
    const file = await (await dbClient.filesCollection())
      .findOne({
        _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
        userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
      });
    if (!file) {
      return res.status(404).send({ error: 'Not found' });
    }

    return res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId === ROOT_FOLDER_ID.toString()
        ? 0
        : file.parentId.toString(),
    });
  }

  /**
  * retrieve all users file documents for a specific parentId and with pagination
  * @param {req} The express request object
  * @param {res} The express response object
  */
  static async getIndex(req, res) {
    const xToken = req.header('X-Token');
    if (!xToken) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const key = `auth_${xToken}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const userObj = await (await dbClient.usersCollection()).findOne({
      _id: new mongoDBCore.BSON.ObjectId(userId),
    });
    if (!userObj) {
      return res.status(404).send({ error: 'User Not found' });
    }
    const parentId = req.query.parentId || ROOT_FOLDER_ID.toString();
    const page = /\d+/.test((req.query.page || '').toString())
      ? Number.parseInt(req.query.page, 10)
      : 0;
    const fileFilters = {
      userId: userObj ? userObj._id : NULL_ID,
      parentId: parentId === ROOT_FOLDER_ID.toString()
        ? parentId
        : new mongoDBCore.BSON.ObjectId(isValidId(parentId) ? parentId : NULL_ID),
    };
    const files = await (await (await dbClient.filesCollection())
      .aggregate([
        { $match: fileFilters },
        { $sort: { _id: -1 } },
        { $skip: page * MAX_FILES_PER_PAGE },
        { $limit: MAX_FILES_PER_PAGE },
        {
          $project: {
            _id: 0,
            id: '$_id',
            userId: '$userId',
            name: '$name',
            type: '$type',
            isPublic: '$isPublic',
            parentId: {
              $cond: { if: { $eq: ['$parentId', '0'] }, then: 0, else: '$parentId' },
            },
          },
        },
      ])).toArray();
    return res.status(200).json(files);
  }

  /**
  *  set isPublic to true on the file document based on the ID
  * @param {req} The express request object
  * @param {res} The express response object
  */
  static async putPublish(req, res) {
    const xToken = req.header('X-Token');
    if (!xToken) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const key = `auth_${xToken}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const id = req.params ? req.params.id : NULL_ID;
    const filterFile = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    };
    const file = await (await dbClient.filesCollection())
      .findOne(filterFile);
    if (!file) {
      return res.status(404).send({ error: 'Not found' });
    }
    await (await dbClient.filesCollection())
      .updateOne(filterFile, { $set: { isPublic: true } });

    return res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId: file.parentId === ROOT_FOLDER_ID.toString()
        ? 0
        : file.parentId.toString(),
    });
  }

  /**
  *  set isPublic to false on the file document based on the ID
  * @param {req} The express request object
  * @param {res} The express response object
  */
  static async putUnpublish(req, res) {
    const xToken = req.header('X-Token');
    if (!xToken) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const key = `auth_${xToken}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const id = req.params ? req.params.id : NULL_ID;
    const filterFile = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    };
    const file = await (await dbClient.filesCollection())
      .findOne(filterFile);
    if (!file) {
      return res.status(404).send({ error: 'Not found' });
    }
    await (await dbClient.filesCollection())
      .updateOne(filterFile, { $set: { isPublic: false } });

    return res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: false,
      parentId: file.parentId === ROOT_FOLDER_ID.toString()
        ? 0
        : file.parentId.toString(),
    });
  }

  /**
  * return the content of the file document based on the ID
  * @param {req} The express request object
  * @param {res} The express response object
  */
  static async getFile(req, res) {
    const id = req.params ? req.params.id : NULL_ID;
    let xToken = req.header('X-Token');
    const size = req.query.size || null;
    if (!xToken) {
      xToken = null;
    }
    const key = `auth_${xToken}`;
    let userId = await redisClient.get(key);
    if (!userId) {
      userId = null;
    }
    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
    };
    const file = await (await dbClient.filesCollection())
      .findOne(fileFilter);
    if (!file || (!file.isPublic && (file.userId.toString() !== userId))) {
      return res.status(404).send({ error: 'Not found' });
    }
    if (file.type === acceptedType.folder) {
      return res.status(400).send({ error: 'A folder doesn\'t have content' });
    }
    let filePath = file.localPath;
    if (size) {
      filePath = `${file.localPath}_${size}`;
    }
    if (existsSync(filePath)) {
      const fileInfo = await statAsync(filePath);
      if (!fileInfo.isFile()) {
        return res.status(404).send({ error: 'Not found' });
      }
    } else {
      return res.status(404).send({ error: 'Not found' });
    }
    const absoluteFilePath = await realpathAsync(filePath);
    res.setHeader('Content-Type', contentType(file.name) || 'text/plain; charset=utf-8');
    return res.status(200).sendFile(absoluteFilePath);
  }
}
