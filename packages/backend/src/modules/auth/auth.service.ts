import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
}

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // In-memory user store for development
  // In production, replace with database queries
  private users: Map<string, { password: string; user: User }> = new Map();

  constructor(private jwtService: JwtService) {
    // Initialize with default admin user for development
    this.initializeDefaultUsers();
  }

  /**
   * Initialize default users for development
   */
  private async initializeDefaultUsers() {
    if (process.env.NODE_ENV !== 'production') {
      const defaultPassword = await bcrypt.hash('admin123', 10);
      this.users.set('admin@example.com', {
        password: defaultPassword,
        user: {
          id: '1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
        },
      });

      this.logger.log('Default admin user initialized (admin@example.com / admin123)');
    }
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const userRecord = this.users.get(email);
    if (!userRecord) {
      return null;
    }

    const isValid = await bcrypt.compare(password, userRecord.password);
    if (!isValid) {
      return null;
    }

    return userRecord.user;
  }

  /**
   * Generate JWT token for user
   */
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    this.logger.log(`User ${email} logged in successfully`);

    return {
      access_token,
      user,
    };
  }

  /**
   * Validate JWT payload
   */
  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    // In production, fetch user from database
    const userRecord = Array.from(this.users.values()).find(
      (record) => record.user.id === payload.sub,
    );

    if (!userRecord) {
      return null;
    }

    return userRecord.user;
  }

  /**
   * Register new user (development only)
   */
  async register(email: string, password: string, name: string): Promise<User> {
    if (this.users.has(email)) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user: User = {
      id: `${this.users.size + 1}`,
      email,
      name,
      role: 'user',
    };

    this.users.set(email, { password: hashedPassword, user });

    this.logger.log(`User ${email} registered successfully`);

    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const userRecord = Array.from(this.users.values()).find(
      (record) => record.user.id === userId,
    );

    return userRecord?.user || null;
  }
}
