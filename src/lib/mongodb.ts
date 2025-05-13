import { MongoClient, Collection, Db, Document } from 'mongodb';

// Connection URL - use the container name since they're on the same Docker network
const url = 'mongodb://0fDoshvM:67+S$sVP9rru0g*R@local6342:27017';
const dbName = 'custodial_db';

// Create a singleton MongoDB client
let client: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  if (cachedDb) return cachedDb;

  if (!client) {
    client = new MongoClient(url);
    await client.connect();
  }

  cachedDb = client.db(dbName);
  return cachedDb;
}

export async function getCollection<T extends Document = Document>(name: string): Promise<Collection<T>> {
  const db = await connectToDatabase();
  return db.collection<T>(name);
}

export async function insert<T extends Document = Document>(name: string, data: T): Promise<T> {
  const collection = await getCollection<T>(name);
  const result = await collection.insertOne(data as any);
  return { ...data, _id: result.insertedId } as T;
}

export async function update<T extends Document = Document>(
  name: string,
  query: Partial<T>,
  updateData: Partial<T>
): Promise<T[]> {
  const collection = await getCollection<T>(name);
  await collection.updateMany(query as any, { $set: updateData as any });
  
  // Fetch the updated documents to return
  const updatedDocs = await collection.find(query as any).toArray();
  return updatedDocs as T[];
}

export async function remove<T extends Document = Document>(name: string, query: Partial<T>): Promise<T[]> {
  const collection = await getCollection<T>(name);
  
  // Find the documents that will be removed
  const docsToRemove = await collection.find(query as any).toArray();
  
  // Remove them
  await collection.deleteMany(query as any);
  
  return docsToRemove as T[];
}

export async function listCollections(): Promise<string[]> {
  const db = await connectToDatabase();
  const collections = await db.listCollections().toArray();
  return collections.map((c) => c.name);
}

// Close connection when process exits
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
}); 