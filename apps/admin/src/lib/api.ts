import {
  type LoginCredentialsDto,
  type AuthTokens,
  type AuthResponse,
  type ChangePasswordDto,
  type ForgotPasswordDto,
  type ResetPasswordDto,
  type SendLoginOtpDto,
  type VerifyLoginOtpDto,
  type SendForgotPasswordOtpDto,
  type VerifyForgotPasswordOtpDto,
  type ResetPasswordWithOtpDto,
  type SendRegistrationOtpDto,
  type VerifyRegistrationOtpDto,
  type RegisterRetailerDto,
  type SendOtpResponse,
  type OnboardUserDto,
  type OnboardUserResponse,
  type InviteUserDto,
  type User,
  type Organisation,
  type CreateOrganisationDto,
  type UpdateOrganisationDto,
  type Product,
  type ProductVariant,
  type ProductVariantDto,
  type CreateProductDto,
  type UpdateProductDto,
  type Category,
  type CreateCategoryDto,
  type UpdateCategoryDto,
  type OrganisationStatus,
} from '@ontime/shared';
import { API_BASE_URL, STORAGE_KEYS } from './config';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  private setTokens(accessToken: string, refreshToken: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  private clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryWithRefresh = true,
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized by attempting to refresh token
      if (response.status === 401 && retryWithRefresh) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.request<T>(endpoint, options, false);
        } else {
          this.clearTokens();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
      }

      const json = (await response.json()) as ApiResponse<T>;
      if (!response.ok) {
        return {
          success: false,
          error: json.message || json.error || `HTTP error ${response.status}`,
        };
      }

      return json;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network connection failed';
      return {
        success: false,
        error: msg,
      };
    }
  }

  // ── Auth Endpoints ──────────────────────────────────────────

  async login(
    dto: LoginCredentialsDto,
  ): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
    const res = await this.request<AuthResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      false,
    );

    if (res.success && res.data?.tokens) {
      this.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data.user));
      }
    }

    return res;
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;
      const json = (await response.json()) as ApiResponse<{ tokens: AuthTokens }>;
      if (json.success && json.data?.tokens) {
        this.setTokens(json.data.tokens.accessToken, json.data.tokens.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    try {
      if (refreshToken) {
        await this.request(
          '/auth/logout',
          {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          },
          false,
        );
      }
    } finally {
      this.clearTokens();
    }
  }

  async getMe(): Promise<{ success: boolean; data?: { user: User }; error?: string }> {
    return this.request<{ user: User }>('/auth/me');
  }

  async changePassword(
    dto: ChangePasswordDto,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.request(
      '/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      false,
    );
  }

  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.request(
      '/auth/reset-password',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      false,
    );
  }

  // ── OTP Authentication ──────────────────────────────────────

  async sendLoginOtp(
    dto: SendLoginOtpDto,
  ): Promise<{ success: boolean; message?: string; data?: SendOtpResponse; error?: string }> {
    return this.request<SendOtpResponse>(
      '/auth/otp/login/send',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      false,
    );
  }

  async verifyLoginOtp(
    dto: VerifyLoginOtpDto,
  ): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
    const res = await this.request<AuthResponse>(
      '/auth/otp/login/verify',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      false,
    );

    if (res.success && res.data?.tokens) {
      this.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data.user));
      }
    }

    return res;
  }

  async sendForgotPasswordOtp(
    dto: SendForgotPasswordOtpDto,
  ): Promise<{ success: boolean; message?: string; data?: SendOtpResponse; error?: string }> {
    return this.request<SendOtpResponse>(
      '/auth/otp/forgot-password/send',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      false,
    );
  }

  async verifyForgotPasswordOtp(dto: VerifyForgotPasswordOtpDto): Promise<{
    success: boolean;
    message?: string;
    data?: { valid: boolean; message: string };
    error?: string;
  }> {
    return this.request<{ valid: boolean; message: string }>(
      '/auth/otp/forgot-password/verify',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      false,
    );
  }

  async resetPasswordWithOtp(
    dto: ResetPasswordWithOtpDto,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.request(
      '/auth/otp/forgot-password/reset',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      false,
    );
  }

  async registerRetailer(
    dto: RegisterRetailerDto,
  ): Promise<{ success: boolean; message?: string; data?: AuthResponse; error?: string }> {
    const res = await this.request<AuthResponse>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      false,
    );

    if (res.success && res.data?.tokens) {
      this.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data.user));
      }
    }

    return res;
  }

  async sendRegistrationOtp(
    dto: SendRegistrationOtpDto,
  ): Promise<{ success: boolean; message?: string; data?: SendOtpResponse; error?: string }> {
    return this.request<SendOtpResponse>(
      '/auth/otp/register/send',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      false,
    );
  }

  async verifyRegistrationOtp(dto: VerifyRegistrationOtpDto): Promise<{
    success: boolean;
    message?: string;
    data?: { valid: boolean; message: string; user?: User };
    error?: string;
  }> {
    return this.request<{ valid: boolean; message: string; user?: User }>(
      '/auth/otp/register/verify',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      false,
    );
  }

  // ── Health Endpoint ─────────────────────────────────────────

  async checkHealth(): Promise<{
    success: boolean;
    data?: { status: string; uptime: number; timestamp: string };
    error?: string;
  }> {
    return this.request<{ status: string; uptime: number; timestamp: string }>(
      '/health',
      { method: 'GET' },
      false,
    );
  }

  // ── Organisations (Retailers) ───────────────────────────────

  async getOrganisations(params?: {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    status?: OrganisationStatus | undefined;
  }): Promise<{
    success: boolean;
    data?: {
      organisations: Organisation[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };
    error?: string;
  }> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', params.page.toString());
    if (params?.limit !== undefined) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/organisations${queryString}`);
  }

  async getOrganisationById(
    id: string,
  ): Promise<{ success: boolean; data?: { organisation: Organisation }; error?: string }> {
    return this.request(`/organisations/${id}`);
  }

  async createOrganisation(
    dto: CreateOrganisationDto,
  ): Promise<{ success: boolean; data?: { organisation: Organisation }; error?: string }> {
    return this.request('/organisations', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateOrganisation(
    id: string,
    dto: UpdateOrganisationDto,
  ): Promise<{ success: boolean; data?: { organisation: Organisation }; error?: string }> {
    return this.request(`/organisations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async updateOrganisationStatus(
    id: string,
    status: OrganisationStatus,
  ): Promise<{ success: boolean; data?: { organisation: Organisation }; error?: string }> {
    return this.request(`/organisations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ── Products ────────────────────────────────────────────────

  async getProducts(params?: {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    categoryId?: string | undefined;
    isActive?: boolean | undefined;
  }): Promise<{
    success: boolean;
    data?: {
      products: (Product & { category?: Category | null })[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };
    error?: string;
  }> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', params.page.toString());
    if (params?.limit !== undefined) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/products${queryString}`);
  }

  async createProduct(
    dto: CreateProductDto,
  ): Promise<{ success: boolean; data?: { product: Product }; error?: string }> {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
  ): Promise<{ success: boolean; data?: { product: Product }; error?: string }> {
    return this.request(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async deleteProduct(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // ── Categories ──────────────────────────────────────────────

  async getCategories(params?: { search?: string | undefined }): Promise<{
    success: boolean;
    data?: {
      categories: (Category & { _count?: { products: number } })[];
    };
    error?: string;
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/categories${queryString}`);
  }

  async createCategory(
    dto: CreateCategoryDto,
  ): Promise<{ success: boolean; data?: { category: Category }; error?: string }> {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<{ success: boolean; data?: { category: Category }; error?: string }> {
    return this.request(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async deleteCategory(
    id: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // ── Users ───────────────────────────────────────────────────

  async getUsers(params?: {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    organisationId?: string | undefined;
  }): Promise<{
    success: boolean;
    data?: {
      users: (User & { organisation?: Organisation | null })[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };
    error?: string;
  }> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', params.page.toString());
    if (params?.limit !== undefined) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.organisationId) query.set('organisationId', params.organisationId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/users${queryString}`);
  }

  async onboardUser(
    dto: OnboardUserDto,
  ): Promise<{ success: boolean; message?: string; data?: OnboardUserResponse; error?: string }> {
    return this.request<OnboardUserResponse>(
      '/users/onboard',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      true,
    );
  }

  async inviteUser(
    dto: InviteUserDto,
  ): Promise<{ success: boolean; message?: string; data?: OnboardUserResponse; error?: string }> {
    return this.onboardUser(dto);
  }
}

export const api = new ApiClient();
