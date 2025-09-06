// src/user/user.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

import { ClimatePreference, TravelType } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  getAllUserRequestDto,
  getAllUserResponseDto,
  getOneUserDto,
  getUserByEmailDto,
} from './dto/get-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserDto } from './dto/user.dto';

/* ---------- Test types & helpers ---------- */
type UserOut = {
  id: string;
  name: string;
  email: string;
  password?: string;
  travelType: TravelType | null;
  climatePreference: ClimatePreference | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function makeUser(p: Partial<UserOut> = {}): UserOut {
  return {
    id: p.id ?? 'u-1',
    name: p.name ?? 'Alice',
    email: p.email ?? 'alice@example.com',
    password: p.password,
    travelType: p.travelType ?? null,
    climatePreference: p.climatePreference ?? null,
    createdAt: p.createdAt ?? new Date('2024-01-01T00:00:00Z'),
    updatedAt: p.updatedAt ?? new Date('2024-01-01T00:00:00Z'),
    deletedAt: p.deletedAt ?? null,
  };
}

/* ---------- Typed mock for UserService ---------- */
function makeMockUserService(): jest.Mocked<UserService> {
  return {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getById: jest.fn(),
    getAll: jest.fn(),
    getByEmail: jest.fn(),
    login: jest.fn(),
    logger: undefined,
  } as unknown as jest.Mocked<UserService>;
}

describe('UserController', () => {
  let controller: UserController;
  let svc: jest.Mocked<UserService>;

  beforeEach(async () => {
    svc = makeMockUserService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: svc }],
    }).compile();

    controller = module.get(UserController);
  });

  /* ---------- create ---------- */
  it('create: delegates to service and returns user', async () => {
    const input: CreateUserDto = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret',
    };

    const result = new UserDto(makeUser());
    svc.create.mockResolvedValueOnce(result);

    const out = await controller.create(input);

    // avoid unbound-method rule by checking mock.calls directly
    expect(svc.create.mock.calls[0][0]).toEqual(input);
    expect(out.email).toBe('alice@example.com');
  });

  /* ---------- update ---------- */
  it('update: delegates to service and returns user', async () => {
    const input: UpdateUserDto = {
      id: 'u-1',
      name: 'New',
      email: 'new@example.com',
      travelType: TravelType.LEISURE,
      climatePreference: ClimatePreference.NO_PREFERENCE,
    };

    const result = new UserDto(
      makeUser({
        id: 'u-1',
        name: 'New',
        email: 'new@example.com',
        travelType: TravelType.LEISURE,
        climatePreference: ClimatePreference.NO_PREFERENCE,
      }),
    );
    svc.update.mockResolvedValueOnce(result);

    const out = await controller.update(input);

    expect(svc.update.mock.calls[0][0]).toEqual(input);
    expect(out.name).toBe('New');
  });

  /* ---------- delete ---------- */
  it('delete: returns void on success', async () => {
    const input: DeleteUserDto = { id: 'u-1' };
    svc.delete.mockResolvedValueOnce(undefined);

    await expect(controller.delete(input)).resolves.toBeUndefined();
    expect(svc.delete.mock.calls[0][0]).toEqual(input);
  });

  /* ---------- get-one ---------- */
  it('getById: returns one user', async () => {
    const input: getOneUserDto = { id: 'u-2' };
    const result = new UserDto(makeUser({ id: 'u-2', email: 'b@b.com' }));
    svc.getById.mockResolvedValueOnce(result);

    const out = await controller.getById(input);

    expect(svc.getById.mock.calls[0][0]).toEqual(input);
    expect(out.email).toBe('b@b.com');
  });

  /* ---------- get-all ---------- */
  it('getAll: returns paged users', async () => {
    const input: getAllUserRequestDto = {
      page: 1,
      size: 10,
      isDeleted: false,
    } as getAllUserRequestDto;

    const items = [
      new UserDto(makeUser({ id: 'u-3' })),
      new UserDto(makeUser({ id: 'u-4' })),
    ];
    const response = new getAllUserResponseDto(items.length, items);

    svc.getAll.mockResolvedValueOnce(response);

    const out = await controller.getAll(input);

    expect(svc.getAll.mock.calls[0][0]).toEqual(input);

    const { count } = out as unknown as { count: number };
    expect(count).toBe(items.length);
  });

  /* ---------- get-by-email ---------- */
  it('getByEmail: returns user', async () => {
    const input: getUserByEmailDto = { email: 'c@c.com' };
    const result = new UserDto(makeUser({ email: 'c@c.com' }));
    svc.getByEmail.mockResolvedValueOnce(result);

    const out = await controller.getByEmail(input);

    expect(svc.getByEmail.mock.calls[0][0]).toEqual(input);
    expect((out as UserDto).email).toBe('c@c.com');
  });

  /* ---------- login ---------- */
  it('login: returns access token', async () => {
    const input: LoginDto = { email: 'login@example.com', password: 'p' };
    svc.login.mockResolvedValueOnce({ access_token: 'jwt' });

    const out = await controller.login(input);

    expect(svc.login.mock.calls[0][0]).toEqual(input);
    expect((out as { access_token: string }).access_token).toBe('jwt');
  });
});
