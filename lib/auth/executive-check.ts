/**
 * Executive users configuration
 */
export const EXECUTIVE_USERS = [
  'jmarkey@irelandpay.com',
  'wvazquez@irelandpay.com'
] as const;

export type ExecutiveEmail = typeof EXECUTIVE_USERS[number];

/**
 * Check if a user is an authorized executive
 */
export function isExecutiveUser(email: string | null | undefined): email is ExecutiveEmail {
  return email !== null && email !== undefined && EXECUTIVE_USERS.includes(email.toLowerCase() as ExecutiveEmail);
}

/**
 * Get executive user details
 */
export function getExecutiveUserDetails(email: ExecutiveEmail) {
  const executiveDetails = {
    'jmarkey@irelandpay.com': {
      name: 'Jake Markey',
      role: 'admin'
    },
    'wvazquez@irelandpay.com': {
      name: 'Wilfredo Vazquez',
      role: 'admin'
    }
  };
  
  return executiveDetails[email.toLowerCase() as ExecutiveEmail];
}

/**
 * Determine user role - executives always get admin role
 */
export function determineUserRole(email: string | null | undefined, databaseRole?: string): 'admin' | 'agent' {
  if (isExecutiveUser(email)) {
    return 'admin';
  }
  return databaseRole === 'admin' ? 'admin' : 'agent';
} 