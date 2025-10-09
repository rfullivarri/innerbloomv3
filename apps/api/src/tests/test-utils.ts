import type { NextFunction, Request, Response } from 'express';
import { vi, type MockedFunction } from 'vitest';

type RequestUser = Request['user'];

type MockRequestOverrides<TUser extends RequestUser> = Partial<
  Omit<Request, 'get' | 'header' | 'headers' | 'user'>
> & {
  get?: Request['get'];
  header?: Request['header'];
  headers?: Record<string, string | undefined>;
  user?: TUser;
};

export function mockReq<TUser extends RequestUser = RequestUser>(
  overrides: MockRequestOverrides<TUser> = {},
): Request & { user?: TUser } {
  const { headers = {}, get, header, user, ...rest } = overrides;
  const headerStore = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(headers)) {
    headerStore.set(key.toLowerCase(), value);
  }

  const resolveHeader = (name: string) => headerStore.get(name.toLowerCase());

  const request: Partial<Request> & { user?: TUser } = {
    ...rest,
    user,
    headers: headers as Request['headers'],
    get:
      get ??
      (((name: string) => {
        const result = resolveHeader(name);
        return result ?? undefined;
      }) as unknown as Request['get']),
    header:
      header ??
      (((name: string) => {
        const result = resolveHeader(name);
        return result ?? undefined;
      }) as unknown as Request['header']),
  };

  return request as Request & { user?: TUser };
}

export function mockRes(): Response {
  const response: Partial<Response> = {};

  const statusMock = vi
    .fn((statusCode: number) => {
      void statusCode;
      return response as Response;
    })
    .mockName('res.status');
  const jsonMock = vi
    .fn((payload: unknown) => {
      void payload;
      return response as Response;
    })
    .mockName('res.json');
  const endMock = vi.fn(() => response as Response).mockName('res.end');

  response.status = statusMock as unknown as Response['status'];
  response.json = jsonMock as unknown as Response['json'];
  response.end = endMock as unknown as Response['end'];

  return response as Response;
}

type NextFunctionMock = MockedFunction<NextFunction> & NextFunction;

export function mockNext(): NextFunctionMock {
  const next = vi
    .fn((...args: Parameters<NextFunction>) => {
      void args;
      return undefined as ReturnType<NextFunction>;
    })
    .mockName('next');

  return next as NextFunctionMock;
}
