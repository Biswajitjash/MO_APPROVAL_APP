import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword, comparePassword, generateToken } from './encryption.js'; // ← Fixed: removed rogue space

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '../data/users.json');

// In-memory session store
const sessions = new Map();

class AuthManager {
  constructor() {
    this.ensureDataFile();
  }

  async ensureDataFile() {
    try {
      await fs.access(USERS_FILE);
    } catch {
      const defaultData = {
        users: [
          {
            userId:    'admin',
            password:  await hashPassword('admin123'),
            name:      'Administrator',
            email:     'admin@ampl.in',
            role:      'admin',
            plant:     'ALL',
            active:    true,
            createdAt: new Date().toISOString(),
            lastLogin: null
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      const dataDir = path.dirname(USERS_FILE);
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(USERS_FILE, JSON.stringify(defaultData, null, 2));
      console.log('created users.json with default admin user');
    }
  }

  async readUsers() {
    try {
      const data = await fs.readFile(USERS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error('Failed to read users file: ' + error.message);
    }
  }

  async writeUsers(data) {
    try {
      data.lastUpdated = new Date().toISOString();
      await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      throw new Error('Failed to write users file: ' + error.message);
    }
  }

  async authenticate(userId, password) {
    try {
      const data = await this.readUsers();
      const user = data.users.find(u => u.userId === userId);
      if (!user) return { success: false, error: 'Invalid username or password' };
      if (!user.active) return { success: false, error: 'User account is disabled' };
      const passwordMatch = await comparePassword(password, user.password);
      if (!passwordMatch) return { success: false, error: 'Invalid username or password' };
      user.lastLogin = new Date().toISOString();
      await this.writeUsers(data);
      const token = generateToken();
      const sessionData = {
        userId: user.userId, name: user.name, email: user.email,
        role: user.role, plant: user.plant, loginTime: new Date().toISOString()
      };
      sessions.set(token, sessionData);
      console.log('User ' + userId + ' logged in successfully');
      return { success: true, token, user: sessionData };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  verifyToken(token) {
    if (!token) return { valid: false, error: 'No token provided' };
    const session = sessions.get(token);
    if (!session) return { valid: false, error: 'Invalid or expired session' };
    return { valid: true, user: session };
  }

  logout(token) {
    if (sessions.has(token)) {
      const session = sessions.get(token);
      console.log('User ' + session.userId + ' logged out');
      sessions.delete(token);
      return { success: true };
    }
    return { success: false, error: 'Session not found' };
  }

  async getAllUsers() {
    const data = await this.readUsers();
    return data.users.map(({ password, ...user }) => user);
  }

  async getUserById(userId) {
    try {
      const data = await this.readUsers();
      const user = data.users.find(u => u.userId.toUpperCase() === userId.toUpperCase());
      return user || null;
    } catch (error) {
      console.error('getUserById error:', error);
      throw error;
    }
  }

  async addUser(userData) {
    try {
      const data = await this.readUsers();
      if (data.users.some(u => u.userId === userData.userId)) {
        return { success: false, error: 'User ID already exists' };
      }
      const hashedPassword = await hashPassword(userData.password);
      const newUser = {
        userId: userData.userId, password: hashedPassword, name: userData.name,
        email: userData.email, role: userData.role || 'user', plant: userData.plant || 'ALL',
        active: true, createdAt: new Date().toISOString(), lastLogin: null
      };
      data.users.push(newUser);
      await this.writeUsers(data);
      console.log('User ' + userData.userId + ' created successfully');
      return { success: true, user: { ...newUser, password: undefined } };
    } catch (error) {
      console.error('Add user error:', error);
      return { success: false, error: 'Failed to add user' };
    }
  }

  async updateUser(userId, updates) {
    try {
      const data = await this.readUsers();
      const userIndex = data.users.findIndex(u => u.userId === userId);
      if (userIndex === -1) return { success: false, error: 'User not found' };
      if (updates.password) updates.password = await hashPassword(updates.password);
      data.users[userIndex] = { ...data.users[userIndex], ...updates };
      await this.writeUsers(data);
      console.log('User ' + userId + ' updated successfully');
      return { success: true, user: { ...data.users[userIndex], password: undefined } };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: 'Failed to update user' };
    }
  }

  async deleteUser(userId) {
    try {
      const data = await this.readUsers();
      const initialLength = data.users.length;
      data.users = data.users.filter(u => u.userId !== userId);
      if (data.users.length === initialLength) return { success: false, error: 'User not found' };
      await this.writeUsers(data);
      console.log('User ' + userId + ' deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      return { success: false, error: 'Failed to delete user' };
    }
  }

  async changePassword(userId, oldPassword, newPassword) {
    try {
      const data = await this.readUsers();
      const user = data.users.find(u => u.userId === userId);
      if (!user) return { success: false, error: 'User not found' };
      const passwordMatch = await comparePassword(oldPassword, user.password);
      if (!passwordMatch) return { success: false, error: 'Current password is incorrect' };
      user.password = await hashPassword(newPassword);
      await this.writeUsers(data);
      console.log('Password changed for user ' + userId);
      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Failed to change password' };
    }
  }

  async resetPassword(userId, newPassword) {
    try {
      const data = await this.readUsers();
      const index = data.users.findIndex(u => u.userId.toUpperCase() === userId.toUpperCase());
      if (index === -1) return { success: false, error: 'User not found' };
      data.users[index].password = await hashPassword(newPassword);
      await this.writeUsers(data);
      console.log('Password reset for user ' + userId);
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('resetPassword error:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }
}

export default new AuthManager();