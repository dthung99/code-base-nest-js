// src/common/services/crypto.service.ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class CryptoService {
  private readonly saltRounds = 10;

  async hashPassword(
    password: string,
    saltRounds = this.saltRounds,
  ): Promise<string> {
    return bcrypt.hash(password, saltRounds);
  }

  async comparePasswords(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }

  async randomPassword(): Promise<string> {
    return randomBytes(32).toString('hex');
  }
}
