import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

export function generateTOTPSecret(accountName: string, issuer: string = 'PlatformAdmin') {
    const totp = new OTPAuth.TOTP({
        issuer,
        label: accountName,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }),
    })

    return {
        secret: totp.secret.base32,
        uri: totp.toString(),
    }
}

export function verifyTOTP(secret: string, token: string): boolean {
    const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
    })

    // Allow 1 period before/after for clock drift
    const delta = totp.validate({ token, window: 1 })
    return delta !== null
}

export function generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
        const code = Array.from({ length: 8 }, () =>
            Math.random().toString(36).charAt(2).toUpperCase()
        ).join('')
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
    }
    return codes
}

export function generateTOTPCode(secret: string): string {
    const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
    })

    return totp.generate()
}

export async function generateQRCodeFromSecret(
    secret: string,
    accountName: string,
    issuer: string = 'PlatformAdmin'
) {
    const totp = new OTPAuth.TOTP({
        issuer,
        label: accountName,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
    })

    const otpauth = totp.toString()
    const qrCode = await QRCode.toDataURL(otpauth)

    return {
        otpauth,
        qrCode,
    }
}