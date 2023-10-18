import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.header('Authorization');
    const credentialsBase64 = authHeader.split(' ')[1];
    if (!credentialsBase64) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const credentials = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
    const [email, password] = credentials.split(':');
    if (!email || !password) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const userCredentials = { email, password: sha1(password) };
    const user = await (await dbClient.usersCollection()).findOne(userCredentials);
    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const token = uuidv4();
    const key = `auth_${token}`;
    redisClient.set(key, user._id.toString(), 24 * 60 * 3600);
    return res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const xToken = req.header('X-Token');
    if (!xToken) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const key = `auth_${xToken}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    await redisClient.del(key);
    return res.status(204).end();
  }
}
