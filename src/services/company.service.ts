import { v4 as uuidv4 } from 'uuid';
import { db } from '../storage/database';
import { Company } from '../types';

export class CompanyService {
  async create(name: string): Promise<Company> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      'INSERT INTO companies (id, name, created_at) VALUES (?, ?, ?)',
      [id, name, now]
    );

    return { id, name, created_at: now };
  }

  async getById(id: string): Promise<Company | undefined> {
    return db.get<Company>('SELECT * FROM companies WHERE id = ?', [id]);
  }

  async getAll(): Promise<Company[]> {
    return db.all<Company>('SELECT * FROM companies ORDER BY name');
  }

  async searchByName(query: string): Promise<Company[]> {
    return db.all<Company>(
      'SELECT * FROM companies WHERE name LIKE ? LIMIT 50',
      [`%${query}%`]
    );
  }

  async getByName(name: string): Promise<Company | undefined> {
    return db.get<Company>('SELECT * FROM companies WHERE name = ?', [name]);
  }

  async updateName(id: string, name: string): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      'UPDATE companies SET name = ? WHERE id = ?',
      [name, id]
    );
  }

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM companies WHERE id = ?', [id]);
  }

  async deleteAll(): Promise<void> {
    await db.run('DELETE FROM companies', []);
  }
}

export const companyService = new CompanyService();
