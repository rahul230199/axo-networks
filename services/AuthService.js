const User = require('../models/User');
const jwt = require('jsonwebtoken');

class AuthService {
    // Admin login
    static async adminLogin(email, password) {
        try {
            if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
                const token = jwt.sign(
                    { userId: "admin", email, role: "admin" },
                    process.env.JWT_SECRET || "secret",
                    { expiresIn: '24h' }
                );

                return {
                    success: true,
                    message: "Admin login successful",
                    token,
                    user: {
                        email,
                        name: "Admin",
                        role: "admin",
                        forcePasswordReset: false
                    }
                };
            }
            return null;
        } catch (error) {
            console.error("Admin login error:", error);
            return null;
        }
    }

    // User login with password reset support
    static async userLogin(email, password, newPassword = null) {
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
            
            if (!user) {
                return {
                    success: false,
                    message: "Invalid credentials"
                };
            }

            // Password reset flow
            if (newPassword && user.forcePasswordReset) {
                console.log("🔄 Password reset flow for:", user.email);

                if (newPassword.length < 6) {
                    return {
                        success: false,
                        message: "New password must be at least 6 characters"
                    };
                }

                // Update password
                user.password = newPassword;
                user.tempPassword = newPassword;
                user.forcePasswordReset = false;
                await user.save();

                console.log("✅ Password reset successful for:", user.email);

                // Create token after successful password reset
                const token = jwt.sign(
                    {
                        userId: user._id,
                        email: user.email,
                        userType: user.userType
                    },
                    process.env.JWT_SECRET || "secret",
                    { expiresIn: '24h' }
                );

                return {
                    success: true,
                    message: "Password reset successful",
                    token,
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
            }

            // Regular login - Check password
            const isValidPassword = password === user.password || password === user.tempPassword;

            if (!isValidPassword) {
                return {
                    success: false,
                    message: "Invalid credentials"
                };
            }

            // Check if user needs to reset password
            const usingTempPassword = (password === user.tempPassword) && user.forcePasswordReset;

            // Create login token (only if not using temporary password)
            let token = null;
            if (!usingTempPassword) {
                token = jwt.sign(
                    {
                        userId: user._id,
                        email: user.email,
                        userType: user.userType
                    },
                    process.env.JWT_SECRET || "secret",
                    { expiresIn: '24h' }
                );
            }

            console.log("✅ Login successful for:", user.email);

            return {
                success: true,
                message: usingTempPassword ? "Password reset required" : "Login successful",
                token: token,
                user: {
                    _id: user._id,
                    email: user.email,
                    name: user.name,
                    username: user.username,
                    company: user.company,
                    userType: user.userType || 'supplier',
                    forcePasswordReset: usingTempPassword
                },
                forcePasswordReset: usingTempPassword
            };

        } catch (error) {
            console.error("🔥 AuthService login error:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Verify token
    static async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
            
            if (decoded.userId === "admin") {
                return {
                    authenticated: true,
                    user: {
                        _id: "admin",
                        email: decoded.email,
                        name: "Admin",
                        username: "admin",
                        company: "AXO Networks",
                        userType: "admin",
                        forcePasswordReset: false
                    }
                };
            }

            const user = await User.findById(decoded.userId);
            
            if (!user) {
                return {
                    authenticated: false,
                    message: "User not found"
                };
            }

            return {
                authenticated: true,
                user: {
                    _id: user._id,
                    email: user.email,
                    name: user.name,
                    username: user.username,
                    company: user.company,
                    userType: user.userType || 'supplier',
                    forcePasswordReset: user.forcePasswordReset
                }
            };

        } catch (error) {
            return {
                authenticated: false,
                message: "Invalid token"
            };
        }
    }

    // Get user profile
    static async getProfile(userId) {
        try {
            if (userId === "admin") {
                return {
                    success: true,
                    user: {
                        _id: "admin",
                        email: "admin@axonetworks.com",
                        name: "Admin",
                        username: "admin",
                        company: "AXO Networks",
                        userType: "admin",
                        phone: "",
                        status: "active",
                        forcePasswordReset: false,
                        createdAt: new Date()
                    }
                };
            }

            const user = await User.findById(userId);

            if (!user) {
                return {
                    success: false,
                    message: "User not found"
                };
            }

            return {
                success: true,
                user: {
                    _id: user._id,
                    email: user.email,
                    name: user.name,
                    username: user.username,
                    company: user.company,
                    userType: user.userType,
                    phone: user.phone,
                    status: user.status,
                    forcePasswordReset: user.forcePasswordReset,
                    createdAt: user.createdAt
                }
            };

        } catch (error) {
            console.error("Profile error:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = AuthService;
