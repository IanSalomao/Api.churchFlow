import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Libera a rota do JwtAuthGuard global (register, login, recuperação de senha). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
