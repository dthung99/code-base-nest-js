import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/services/users.service';
import { User } from 'src/modules/users/entities/user.entity';
import {
  JwtPayload,
  RefreshTokenPayload,
} from '../interfaces/jwt-payload.interface';
import { AuthTokenInterface } from '../interfaces/auth-token.interface';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from 'src/common/services/crypto.service';

// Add this interface inside your file
interface GoogleUserInfo {
  email: string;
  googleId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cryptoService: CryptoService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    const isPasswordValid = await this.cryptoService.comparePasswords(
      password,
      user.hashPassword,
    );

    if (user && isPasswordValid) {
      return user;
    }
    throw new UnauthorizedException('Wrong password');
  }

  async login(user: User): Promise<AuthTokenInterface> {
    return this.generateTokens(user.id);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenInterface> {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('auth.jwt.secret'),
        },
      );

      // Check if this is a refresh token
      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Generate new tokens using user ID from the refresh token
      return this.generateTokens(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // New method to validate Google users
  async validateOrCreateGoogleUser(userInfo: GoogleUserInfo): Promise<User> {
    try {
      // Try to find an existing user with this email
      const existingUser = await this.usersService.findByEmail(userInfo.email);
      return existingUser;
    } catch {
      // User doesn't exist, create a new one
      // Generate a random password for the user (they will never use it directly)
      const randomPassword = await this.cryptoService.randomPassword();

      // Create new user
      const newUser = await this.usersService.create({
        email: userInfo.email,
        password: randomPassword, // This will be hashed by the users service
        // You might want to assign default roles here
      });

      return newUser;
    }
  }

  // Method to create tokens for Google-authenticated user
  async loginWithGoogle(user: User): Promise<AuthTokenInterface> {
    // Reuse your existing token generation functionality
    return this.generateTokens(user.id);
  }

  private async generateTokens(userId: string): Promise<AuthTokenInterface> {
    // Get permissions for the user
    const permissions = await this.usersService.getUserPermissions(userId);

    // Get token expiration settings
    const accessTokenExpiresIn =
      this.configService.get<string>('auth.jwt.expiresIn') ?? '1d';
    const refreshTokenExpiresIn =
      this.configService.get<string>('auth.jwt.refreshExpiresIn') ?? '7d';

    // Calculate expiration timestamps
    const accessTokenExpiresAt =
      this.calculateExpirationDate(accessTokenExpiresIn);
    const refreshTokenExpiresAt = this.calculateExpirationDate(
      refreshTokenExpiresIn,
    );

    // Prepare payload for access token
    const payload: JwtPayload = {
      sub: userId,
      permissions,
    };

    const secret = this.configService.get<string>('auth.jwt.secret');

    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: accessTokenExpiresIn,
    });

    // Generate refresh token with longer expiry and different payload
    const refreshToken = this.jwtService.sign(
      { sub: userId, tokenType: 'refresh' },
      {
        secret,
        expiresIn: refreshTokenExpiresIn,
      },
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  private calculateExpirationDate(duration: string): Date {
    // Parse duration like '1d', '7d', '15m', etc.
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      // Default to 1 day if format is invalid
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const now = new Date();

    switch (unit) {
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 's':
        return new Date(now.getTime() + value * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default 1 day
    }
  }
}
