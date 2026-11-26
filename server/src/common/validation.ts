export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const PASSWORD_MESSAGE = 'Password needs 8+ characters with uppercase, lowercase, number and special character';

export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const PHONE_MESSAGE = 'Phone must be a valid 10 digit mobile number starting with 6-9';

export const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{2,59}$/;
export const NAME_MESSAGE = 'Name must be 3-60 letters';
