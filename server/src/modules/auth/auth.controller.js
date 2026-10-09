import * as authService from './auth.service.js';
import { User } from '../../models/User.js';
import { Membership } from '../../models/Membership.js';

export const register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  res.clearCookie('refreshToken');
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const memberships = await Membership.find({ userId: req.user._id }).populate('workspaceId');

    res.json({
      success: true,
      data: {
        user,
        memberships: memberships.map((m) => ({
          membershipId: m._id,
          role: m.role,
          workspace: m.workspaceId,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
