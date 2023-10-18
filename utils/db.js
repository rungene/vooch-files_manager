import mongodb from 'mongodb';

// eslint-disable-next-line no-unused-vars
class DBClient {
  /**
  * Creates a new DBclient instance.
  */
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const dbUri = `mongodb://${host}:${port}/${database}`;
    this.client = new mongodb.MongoClient(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    this.isClientConnected = false;
    this.client.connect((err) => {
      if (err) {
        console.error('Error encounted while connecting to MongoDB', err);
      } else {
        this.isClientConnected = true;
        console.log('Connected to MongoDB');
      }
    });
  }

  /**
  * check the status of the connection to MongoDB
  * @returns {boolean}
  */
  isAlive() {
    return this.isClientConnected;
  }

  /**
  * returns the number of documents in the collection users
  * @returns {Promise<Number>}
  */
  async nbUsers() {
    const db = this.client.db();
    const userCollection = db.collection('users');
    const noDocs = await userCollection.countDocuments();
    return noDocs;
  }

  /**
  * returns the number of documents in the collection files
  * @returns {Promise<Number>}
  */
  async nbFiles() {
    const db = this.client.db();
    const fileCollection = db.collection('files');
    const noFiles = await fileCollection.countDocuments();
    return noFiles;
  }

  /**
  * Retrives a refrence to the 'users' collections
  * @returns {Promise<Collection>}
  */
  async usersCollection() {
    const db = this.client.db();
    const userCollection = db.collection('users');
    return userCollection;
  }

  /**
  * Retrives a refrence to the 'files' collections
  * @returns {Promise<Collection>}
  */
  async filesCollection() {
    const db = this.client.db();
    const fileCollection = db.collection('files');
    return fileCollection;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
