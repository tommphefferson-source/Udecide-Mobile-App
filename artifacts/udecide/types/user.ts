export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  createdAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ProfileSetupForm {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface AddressOverride {
  active: boolean;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}
