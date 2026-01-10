"""Encryption service for securely storing credentials."""
import os
import base64
from typing import Optional
from cryptography.fernet import Fernet


class EncryptionService:
    """Service for encrypting and decrypting sensitive data."""
    
    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialize encryption service.
        
        Args:
            encryption_key: 32-byte key as base64 string. If not provided, reads from ENCRYPTION_KEY env var.
        """
        if encryption_key is None:
            encryption_key = os.getenv("ENCRYPTION_KEY")
        
        if not encryption_key:
            raise ValueError(
                "ENCRYPTION_KEY environment variable is required. "
                "Generate a key using: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        
        # If key is not base64-encoded, encode it
        try:
            # Try to decode to verify it's valid base64
            base64.b64decode(encryption_key)
            self.key = encryption_key.encode()
        except Exception:
            # If not valid base64, treat as raw bytes and encode
            if len(encryption_key) < 32:
                raise ValueError("Encryption key must be at least 32 bytes")
            # Pad or truncate to 32 bytes and base64 encode
            key_bytes = encryption_key[:32].encode() if len(encryption_key) >= 32 else encryption_key.encode().ljust(32, b'0')
            self.key = base64.urlsafe_b64encode(key_bytes)
        
        self.cipher = Fernet(self.key)
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext string.
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Base64-encoded encrypted string
        """
        if not plaintext:
            return ""
        return self.cipher.encrypt(plaintext.encode()).decode()
    
    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt ciphertext string.
        
        Args:
            ciphertext: Base64-encoded encrypted string
            
        Returns:
            Decrypted plaintext string
        """
        if not ciphertext:
            return ""
        return self.cipher.decrypt(ciphertext.encode()).decode()

