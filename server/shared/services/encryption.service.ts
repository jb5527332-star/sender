import CryptoJS from "crypto-js";
import { envConfig } from "../config/env.config";

export class EncryptionService {
  private static secretKey = envConfig.encryption.key;

  public static encrypt(text: string): string {
    if (!text) return "";
    try {
      return CryptoJS.AES.encrypt(text, this.secretKey).toString();
    } catch (error) {
      throw new Error("Encryption failed");
    }
  }

  public static decrypt(encryptedText: string): string {
    if (!encryptedText) return "";
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error("Decryption produced empty result");
      }
      return decrypted;
    } catch (error) {
      throw new Error("Decryption failed");
    }
  }

  public static hash(text: string): string {
    return CryptoJS.SHA256(text).toString();
  }
}

export const encrypt = (text: string) => EncryptionService.encrypt(text);
export const decrypt = (text: string) => EncryptionService.decrypt(text);
export const hash = (text: string) => EncryptionService.hash(text);
