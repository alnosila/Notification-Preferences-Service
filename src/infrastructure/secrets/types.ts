/**
 * @author alnosila — https://github.com/alnosila
 */

/** Конфигурация приложения из vault (не коммитить реальные значения). */
export interface AppSecrets {
  databaseUrl: string;
  port: number;
  host: string;
  logLevel: string;
}

export type SecretsProvider = 'env' | 'file';
