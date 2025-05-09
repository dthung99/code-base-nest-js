// src/modules/auth/controllers/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { RequestWithUser } from '../interfaces/local-request.interface';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { AuthTokenInterface } from '../interfaces/auth-token.interface';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: RequestWithUser): Promise<AuthTokenInterface> {
    return await this.authService.login(req.user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthTokenInterface> {
    return await this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // This route initiates the Google OAuth flow
    // The guard will handle redirection to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: RequestWithUser, @Res() res: Response) {
    try {
      // Get tokens from your auth service
      const token = await this.authService.loginWithGoogle(req.user);

      // Extract token values and expiration times
      const {
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      } = token;

      // Calculate expiry in milliseconds
      const accessExpiry = new Date(accessTokenExpiresAt);
      const refreshExpiry = new Date(refreshTokenExpiresAt);

      // Set access token cookie
      res.cookie('access_token', accessToken, {
        expires: accessExpiry,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        // domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : 'localhost',
      });

      // Set refresh token cookie
      res.cookie('refresh_token', refreshToken, {
        expires: refreshExpiry,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        // domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : 'localhost',
      });

      // Redirect to frontend dashboard (or other success page)
      const frontendUrl = 'http://localhost:4000';
      return res.redirect(`${frontendUrl}/`);
    } catch (error) {
      // Handle errors
      console.error('Google auth error:', error);

      // Redirect to frontend error page
      const frontendUrl = 'http://localhost:4000';
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }
}
