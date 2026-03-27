export class AuthConstants {
  public static readonly DEFAULT_TOKEN_TTL_SECONDS = 60 * 60;
  public static readonly AUTH_CLOCK_TOLERANCE_SECONDS = 5;
  public static readonly AUTH_TOKEN_MIN_SECRET_LENGTH = 32;
  public static readonly AUTH_TOKEN_TYPE = 'Bearer';
  public static readonly AUTH_TOKEN_ALGORITHM = 'dir';
  public static readonly AUTH_TOKEN_ENCRYPTION = 'A256GCM';
  public static readonly AUTH_TOKEN_TYPE_HEADER = 'JWT';
  public static readonly AUTH_HEADER_NAME = 'authorization';
  public static readonly AUTH_HEADER_SCHEME = 'Bearer';
  public static readonly AUTH_TOKEN_SECRET_ENV = 'AUTH_TOKEN_SECRET';
  public static readonly AUTH_TOKEN_TTL_ENV = 'AUTH_TOKEN_TTL_SECONDS';
}
