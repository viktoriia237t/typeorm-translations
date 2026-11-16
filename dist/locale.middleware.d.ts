import { NestMiddleware } from '@nestjs/common';
import { ResolvedTranslationsOptions } from './interfaces';
interface RequestLike {
    query?: Record<string, unknown>;
    headers: Record<string, string | string[] | undefined>;
}
export declare class LocaleMiddleware implements NestMiddleware {
    private readonly options;
    constructor(options: ResolvedTranslationsOptions);
    use(req: RequestLike, _res: unknown, next: () => void): void;
}
export {};
