const User = require('../models/User');
const jwt = require('jsonwebtoken');

class PasswordResetService {
    // Reset password for first-time users
    static async forceResetPassword(email, newPassword) {
        try {
            console.log('🔄 Force password reset for:', email);

            if (!email || !newPassword) {
                return {
                    success: false,
                    message: "Email and new password are required"
                };
            }

            if (newPassword.length < 6) {
                return {
                    success: false,
                    message: "New password must be at least 6 characters"
                };
            }

            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return {
                    success: false,
                    message: "User not found"
                };
            }

            // Update password
            user.password = newPassword;
            user.tempPassword = newPassword;
            user.forcePasswordReset = false;
            await user.save();

            console.log('✅ Password force reset successful for:', email);

            // Create token
            const token = jwt.sign(
                {
                    userId: user._id,
                    email: user.email,
                    userType: user.userType
                },
                process.env.JWT_SECRET || "secret",
                { expiresIn: "24h" }
            );

            return {
                success: true,
                message: "Password reset successful",
                token: token,
                user: {
                    _id: user._id,
                    email: user.email,
                    name: user.name,
                    username: user.username,
                    company: user.company,
                    userType: user.userType || 'supplier',
                    forcePasswordReset: false
                }
            };

        } catch (error) {
            console.error('❌ Force password reset error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Regular password reset (requires current password)
    static async resetPassword(email, currentPassword, newPassword) {
        try {
            console.log('🔄 Regular password reset for:', email);

            if (!email || !newPassword) {
                return {
                    success: false,
                    message: "Email and new password are required"
                };
            }

            if (newPassword.length < 6) {
                return {
                    success: false,
                    message: "New password must be at least 6 characters"
                };
            }

            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return {
                    success: false,
                    message: "User not found"
                };
            }

            // Verify current password
            if (currentPassword && (currentPassword !== user.password && currentPassword !== user.tempPassword)) {
                return {
                    success: false,
                    message: "Current password is incorrect"
                };
            }

            // Update password
            user.password = newPassword;
            user.tempPassword = newPassword;
            user.forcePasswordReset = false;
            await user.save();

            console.log('✅ Password reset successful for:', email);

            return {
                success: true,
                message: "Password reset successful"
            };

        } catch (error) {
            console.error('❌ Password reset error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Admin password update (no current password required)
    static async adminUpdatePassword(email, newPassword) {
        try {
            console.log('🔧 Admin password update for:', email);

            if (!email || !newPassword) {
                return {
                    success: false,
                    message: "Email and new password are required"
                };
            }

            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return {
                    success: false,
                    message: "User not found"
                };
            }

            // Update password
            user.password = newPassword;
            user.tempPassword = newPassword;
            user.forcePasswordReset = false;
            await user.save();

            console.log('✅ Admin password update successful for:', email);

            return {
                success: true,
                message: "Password updated successfully"
            };

        } catch (error) {
            console.error('❌ Admin password update error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = PasswordResetService;
