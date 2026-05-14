// Password validation utilities

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

// Check if password is too similar to previous passwords
function isTooSimilarToPrevious(newPassword: string, previousPasswords: string[]): boolean {
  for (const oldPassword of previousPasswords) {
    const distance = levenshteinDistance(newPassword.toLowerCase(), oldPassword.toLowerCase())
    // If edit distance is less than 4, passwords are too similar
    if (distance < 4) {
      return true
    }
  }
  return false
}

export function validatePassword(password: string, previousPasswords: string[] = []): PasswordValidationResult {
  const errors: string[] = []

  // Rule 1: Length check (minimum 12 characters)
  if (password.length < 12) {
    errors.push("passwordLengthError")
  }

  // Rule 2: Composition check (uppercase, lowercase, number, symbol)
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
    errors.push("passwordCompositionError")
  }

  // Rule 3: Similarity check (must be significantly different from previous passwords)
  if (previousPasswords.length > 0 && isTooSimilarToPrevious(password, previousPasswords)) {
    errors.push("passwordSimilarityError")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function getPasswordStrengthHelperText(): string {
  return "passwordHelperText"
}
