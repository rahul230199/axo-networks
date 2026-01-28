const User = require('../models/User');
const Supplier = require('../models/Supplier');
const OEM = require('../models/OEM');
const Buyer = require('../models/Buyer');
const crypto = require('crypto');

class UserCreationService {
    // Generate unique username from company name and contact
    static generateUsername(companyName, contactName) {
        // Clean company name
        const cleanCompany = companyName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 15);
        
        // Clean contact name
        const cleanContact = contactName
            .toLowerCase()
            .split(' ')[0]
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 10);
        
        // Generate random number to ensure uniqueness
        const randomNum = Math.floor(100 + Math.random() * 900);
        
        return `${cleanContact}_${cleanCompany}_${randomNum}`;
    }

    // Generate secure temporary password
    static generateTempPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    // Create user based on network request
    static async createUserFromRequest(requestData) {
        const { 
            companyName, 
            contactName, 
            email, 
            phone,
            whatYouDo,
            userType = 'supplier' // Default to supplier if not specified
        } = requestData;

        // Generate credentials
        const username = this.generateUsername(companyName, contactName);
        const tempPassword = this.generateTempPassword();
        
        // Create user in database
        const user = new User({
            username: username,
            email: email.toLowerCase(),
            password: tempPassword, // Will be hashed in pre-save hook
            tempPassword: tempPassword,
            forcePasswordReset: true,
            name: contactName,
            company: companyName,
            phone: phone,
            userType: userType.toLowerCase(),
            roles: this.getRolesForUserType(userType.toLowerCase()),
            companyType: this.getCompanyType(whatYouDo),
            industry: whatYouDo || [],
            status: 'active'
        });

        await user.save();

        // Create role-specific profile if needed
        await this.createRoleSpecificProfile(user, requestData);

        return {
            user,
            credentials: {
                username: username,
                email: email,
                tempPassword: tempPassword
            }
        };
    }

    // Determine user type from activities
    static determineUserType(whatYouDo) {
        if (!whatYouDo || !Array.isArray(whatYouDo)) return 'supplier';
        
        const activities = whatYouDo.join(' ').toLowerCase();
        
        // Check if company does both buying and selling
        const hasBuying = activities.includes('buy') || activities.includes('purchase') || 
                         activities.includes('procure') || activities.includes('source');
        const hasSelling = activities.includes('manufacture') || activities.includes('produce') || 
                          activities.includes('supply') || activities.includes('distribute') ||
                          activities.includes('sell');
        
        if (hasBuying && hasSelling) {
            return 'both';
        } else if (activities.includes('oem') || activities.includes('original equipment') || hasBuying) {
            return 'buyer';
        } else if (hasSelling) {
            return 'supplier';
        }
        
        return 'supplier';
    }

    // Get roles based on user type
    static getRolesForUserType(userType) {
        const roles = {
            buyer: { buyer: true, supplier: false, oem: false, admin: false },
            supplier: { buyer: false, supplier: true, oem: false, admin: false },
            oem: { buyer: true, supplier: false, oem: true, admin: false }, // OEM is also a buyer
            both: { buyer: true, supplier: true, oem: false, admin: false },
            admin: { buyer: false, supplier: false, oem: false, admin: true }
        };

        return roles[userType] || roles.supplier;
    }

    // Determine company type from whatTheyDo
    static getCompanyType(whatYouDo) {
        if (!whatYouDo || !Array.isArray(whatYouDo)) return 'manufacturer';
        
        const activities = whatYouDo.map(a => a.toLowerCase());
        
        if (activities.some(a => a.includes('oem') || a.includes('original equipment'))) {
            return 'oem';
        } else if (activities.some(a => a.includes('manufacture') || a.includes('produce'))) {
            return 'manufacturer';
        } else if (activities.some(a => a.includes('supply') || a.includes('distribute'))) {
            return 'supplier';
        } else if (activities.some(a => a.includes('buy') || a.includes('procure'))) {
            return 'buyer';
        }
        
        return 'manufacturer';
    }

    // Create role-specific profile
    static async createRoleSpecificProfile(user, requestData) {
        const { companyName, whatYouDo } = requestData;
        
        switch (user.userType) {
            case 'supplier':
                const supplier = new Supplier({
                    userId: user._id,
                    companyName: companyName,
                    contactName: user.name,
                    email: user.email,
                    phone: user.phone,
                    capabilities: whatYouDo || [],
                    specialization: whatYouDo?.[0] || 'General Manufacturing',
                    certifications: [],
                    productionCapacity: 'Medium',
                    minOrderQuantity: '1000 units',
                    leadTime: '30-45 days',
                    status: 'active'
                });
                await supplier.save();
                break;

            case 'oem':
                // OEM is treated as buyer for dashboard purposes
                const oemBuyer = new Buyer({
                    userId: user._id,
                    companyName: companyName,
                    contactName: user.name,
                    email: user.email,
                    phone: user.phone,
                    industry: whatYouDo?.[0] || 'Automotive',
                    companySize: 'Medium',
                    annualSpend: 0,
                    preferredSuppliers: [],
                    certificationsRequired: [],
                    status: 'active'
                });
                await oemBuyer.save();
                break;

            case 'buyer':
                const buyer = new Buyer({
                    userId: user._id,
                    companyName: companyName,
                    contactName: user.name,
                    email: user.email,
                    phone: user.phone,
                    industry: whatYouDo?.[0] || 'Manufacturing',
                    companySize: 'Medium',
                    annualSpend: 0,
                    preferredSuppliers: [],
                    certificationsRequired: [],
                    status: 'active'
                });
                await buyer.save();
                break;

            case 'both':
                // Create both buyer and supplier profiles
                const bothBuyer = new Buyer({
                    userId: user._id,
                    companyName: companyName,
                    contactName: user.name,
                    email: user.email,
                    phone: user.phone,
                    industry: whatYouDo?.[0] || 'Manufacturing',
                    companySize: 'Medium',
                    annualSpend: 0,
                    preferredSuppliers: [],
                    certificationsRequired: [],
                    status: 'active'
                });
                await bothBuyer.save();
                
                const bothSupplier = new Supplier({
                    userId: user._id,
                    companyName: companyName,
                    contactName: user.name,
                    email: user.email,
                    phone: user.phone,
                    capabilities: whatYouDo || [],
                    specialization: whatYouDo?.[0] || 'General',
                    certifications: [],
                    productionCapacity: 'Medium',
                    minOrderQuantity: '1000 units',
                    leadTime: '30-45 days',
                    status: 'active'
                });
                await bothSupplier.save();
                break;
        }
    }
}

module.exports = UserCreationService;
