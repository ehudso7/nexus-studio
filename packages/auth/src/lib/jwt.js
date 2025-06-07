import jwt from 'jsonwebtoken';
export function generateToken(payload, secret, expiresIn) {
    return jwt.sign(payload, secret, { expiresIn });
}
export function verifyToken(token, secret) {
    return jwt.verify(token, secret);
}
export function decodeToken(token) {
    try {
        return jwt.decode(token);
    }
    catch {
        return null;
    }
}
export function isTokenExpired(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp)
            return true;
        return decoded.exp * 1000 < Date.now();
    }
    catch {
        return true;
    }
}
