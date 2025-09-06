import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './user.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import PrismaUtil from 'src/common/util/PrismaUtil';

import * as bcrypt from 'bcrypt';
jest.mock('bcrypt');

import { ClimatePreference, TravelType } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  getAllUserRequestDto,
  getOneUserDto,
  getUserByEmailDto,
} from './dto/get-user.dto';
import { LoginDto } from './dto/login.dto';

type DbUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  travelType?: TravelType | null;
  climatePreference?: ClimatePreference | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function makeDbUser(partial?: Partial<DbUser>): DbUser {
  return {
    id: partial?.id ?? 'u-1',
    name: partial?.name ?? 'Alice',
    email: partial?.email ?? 'alice@example.com',
    password: partial?.password ?? 'hashed_pw',
    travelType: partial?.travelType ?? null,
    climatePreference: partial?.climatePreference ?? null,
    createdAt: partial?.createdAt ?? new Date('2024-01-01T00:00:00Z'),
    updatedAt: partial?.updatedAt ?? new Date('2024-01-01T00:00:00Z'),
    deletedAt: partial?.deletedAt ?? null,
  };
}

type PrismaUserMock = {
  findUnique: jest.Mock<Promise<DbUser | null>, [unknown]>;
  create: jest.Mock<Promise<DbUser>, [unknown]>;
  update: jest.Mock<Promise<DbUser>, [unknown]>;
  findMany: jest.Mock<Promise<DbUser[]>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
};

describe('UserService (unit)', () => {
  let service: UserService;

  // Prisma user delegate mocks – use typed jest.fn to satisfy TS/ESLint
  let prismaUser: PrismaUserMock;
  let prismaMock: Pick<PrismaService, 'user'>;

  let jwtSvc: JwtService;
  let signSpy: jest.SpyInstance;
  let paginateSpy: jest.SpiedFunction<typeof PrismaUtil.paginate>;

  // Typed bcrypt mocks
  let hashMock: jest.Mock<Promise<string>, [string, number]>;
  let compareMock: jest.Mock<Promise<boolean>, [string, string]>;

  beforeEach(async () => {
    prismaUser = {
      findUnique: jest.fn<Promise<DbUser | null>, [unknown]>(),
      create: jest.fn<Promise<DbUser>, [unknown]>(),
      update: jest.fn<Promise<DbUser>, [unknown]>(),
      findMany: jest.fn<Promise<DbUser[]>, [unknown]>(),
      count: jest.fn<Promise<number>, [unknown]>(),
    };

    prismaMock = {
      user: prismaUser as unknown as PrismaService['user'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: { sign: () => 'signed-jwt' } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jwtSvc = module.get<JwtService>(JwtService);

    // Bind a spy to the existing sign function to avoid unbound-method lint
    signSpy = jest
      .spyOn(jwtSvc, 'sign')
      .mockReturnValue('signed-jwt' as unknown as string);

    // bcrypt typed mocks (fixes “never” arg issues)
    hashMock = bcrypt.hash as unknown as jest.Mock<
      Promise<string>,
      [string, number]
    >;
    compareMock = bcrypt.compare as unknown as jest.Mock<
      Promise<boolean>,
      [string, string]
    >;
    hashMock.mockReset();
    compareMock.mockReset();

    // Paginate spy – always returns valid skip/take
    paginateSpy = jest.spyOn(PrismaUtil, 'paginate');
    paginateSpy.mockReturnValue({ skip: 0, take: 10 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------- create --------------------
  it('create: hashes password and creates user', async () => {
    const dto: CreateUserDto = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'plain',
    };

    prismaUser.findUnique.mockResolvedValueOnce(null);
    hashMock.mockResolvedValueOnce('hashed_pw');
    prismaUser.create.mockResolvedValueOnce(
      makeDbUser({ password: 'hashed_pw' }),
    );

    const out = await service.create(dto);

    expect(prismaUser.findUnique).toHaveBeenCalledWith({
      where: { email: 'alice@example.com' },
    });
    expect(hashMock).toHaveBeenCalledWith('plain', 10);
    expect(prismaUser.create).toHaveBeenCalledWith({
      data: {
        name: 'Alice',
        email: 'alice@example.com',
        password: 'hashed_pw',
      },
    });
    expect(out.email).toBe('alice@example.com');
  });

  it('create: throws if email already exists', async () => {
    prismaUser.findUnique.mockResolvedValueOnce(
      makeDbUser({ email: 'dup@example.com' }),
    );
    await expect(
      service.create({ name: 'X', email: 'dup@example.com', password: 'p' }),
    ).rejects.toBeDefined();
  });

  // -------------------- update --------------------
  it('update: updates fields when user exists', async () => {
    const existing = makeDbUser({
      id: 'u-2',
      email: 'old@example.com',
      name: 'Old',
    });
    prismaUser.findUnique.mockResolvedValueOnce(existing);

    const updated = makeDbUser({
      id: 'u-2',
      email: 'new@example.com',
      name: 'New',
      travelType: TravelType.LEISURE,
      climatePreference: ClimatePreference.AVOID_RAIN,
    });
    prismaUser.update.mockResolvedValueOnce(updated);

    const dto: UpdateUserDto = {
      id: 'u-2',
      name: 'New',
      email: 'new@example.com',
      travelType: TravelType.LEISURE,
      climatePreference: ClimatePreference.AVOID_RAIN,
    };

    const out = await service.update(dto);

    expect(prismaUser.findUnique).toHaveBeenCalledWith({
      where: { id: 'u-2' },
    });
    expect(prismaUser.update).toHaveBeenCalledWith({
      where: { id: 'u-2' },
      data: {
        name: 'New',
        email: 'new@example.com',
        travelType: TravelType.LEISURE,
        climatePreference: ClimatePreference.AVOID_RAIN,
      },
    });
    expect(out.name).toBe('New');
    expect(out.email).toBe('new@example.com');
  });

  it('update: throws when user not found', async () => {
    prismaUser.findUnique.mockResolvedValueOnce(null);
    const dto: UpdateUserDto = {
      id: 'nope',
      name: 'N',
      email: 'n@example.com',
      travelType: TravelType.FAMILY,
      climatePreference: ClimatePreference.NO_PREFERENCE,
    };
    await expect(service.update(dto)).rejects.toBeDefined();
  });

  // -------------------- delete --------------------
  it('delete: soft deletes existing user', async () => {
    prismaUser.findUnique.mockResolvedValueOnce(makeDbUser({ id: 'u-3' }));
    prismaUser.update.mockResolvedValueOnce(
      makeDbUser({ id: 'u-3', deletedAt: new Date() }),
    );

    await expect(service.delete({ id: 'u-3' })).resolves.toBeUndefined();

    expect(prismaUser.findUnique).toHaveBeenCalledWith({
      where: { id: 'u-3' },
    });

    type UpdateArg = { where: { id: string }; data: { deletedAt: Date } };
    const [firstCall] = prismaUser.update.mock.calls as unknown as [UpdateArg?];
    expect(firstCall).toBeDefined();
    expect(firstCall!.where.id).toBe('u-3');
    expect(firstCall!.data.deletedAt).toBeInstanceOf(Date);
  });

  it('delete: throws when user not found', async () => {
    prismaUser.findUnique.mockResolvedValueOnce(null);
    await expect(service.delete({ id: '404' })).rejects.toBeDefined();
  });

  // -------------------- getById --------------------
  it('getById: returns one user', async () => {
    const u = makeDbUser({ id: 'u-4', email: 'e@e.com' });
    prismaUser.findUnique.mockResolvedValueOnce(u);

    const dto: getOneUserDto = { id: 'u-4' };
    const out = await service.getById(dto);

    expect(prismaUser.findUnique).toHaveBeenCalledWith({
      where: { id: 'u-4' },
    });
    expect(out.email).toBe('e@e.com');
  });

  it('getById: throws if not found', async () => {
    prismaUser.findUnique.mockResolvedValueOnce(null);
    await expect(service.getById({ id: 'missing' })).rejects.toBeDefined();
  });

  // -------------------- getByEmail --------------------
  it('getByEmail: returns user dto', async () => {
    const u = makeDbUser({ email: 'bob@example.com' });
    prismaUser.findUnique.mockResolvedValueOnce(u);

    const dto: getUserByEmailDto = { email: 'bob@example.com' };
    const out = await service.getByEmail(dto);

    expect(prismaUser.findUnique).toHaveBeenCalledWith({
      where: { email: 'bob@example.com' },
    });
    expect(out?.email).toBe('bob@example.com');
  });

  it('getByEmail: throws if not found', async () => {
    prismaUser.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.getByEmail({ email: 'none@example.com' }),
    ).rejects.toBeDefined();
  });

  // -------------------- getAll --------------------
  it('getAll: returns paged non-deleted users ordered desc', async () => {
    const req: getAllUserRequestDto = {
      isDeleted: false,
    } as getAllUserRequestDto;
    paginateSpy.mockReturnValueOnce({ skip: 0, take: 2 });

    const rows = [makeDbUser({ id: 'a' }), makeDbUser({ id: 'b' })];
    prismaUser.findMany.mockResolvedValueOnce(rows);
    prismaUser.count.mockResolvedValueOnce(2);

    const out = await service.getAll(req);

    expect(paginateSpy).toHaveBeenCalledWith(req);
    expect(prismaUser.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 2,
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    expect(prismaUser.count).toHaveBeenCalledWith({
      where: { deletedAt: null },
    });

    const coerced = out as unknown as { count: number; items?: unknown[] };
    expect(coerced.count).toBe(2);
    if (coerced.items) expect(coerced.items.length).toBe(2);
  });

  it('getAll: returns deleted when isDeleted=true', async () => {
    const req: getAllUserRequestDto = {
      isDeleted: true,
    } as getAllUserRequestDto;
    paginateSpy.mockReturnValueOnce({ skip: 3, take: 3 });

    const deletedUsers = [makeDbUser({ id: 'z', deletedAt: new Date() })];
    prismaUser.findMany.mockResolvedValueOnce(deletedUsers);
    prismaUser.count.mockResolvedValueOnce(1);

    const out = await service.getAll(req);

    expect(paginateSpy).toHaveBeenCalledWith(req);
    expect(prismaUser.findMany).toHaveBeenCalledWith({
      skip: 3,
      take: 3,
      where: {},
      orderBy: { createdAt: 'desc' },
    });
    expect(prismaUser.count).toHaveBeenCalledWith({ where: {} });

    const coerced = out as unknown as { count: number };
    expect(coerced.count).toBe(1);
  });

  // -------------------- login --------------------
  it('login: success returns signed JWT', async () => {
    const user = makeDbUser({
      id: 'u-login',
      email: 'login@example.com',
      password: 'hashed_pw',
    });

    prismaUser.findUnique.mockResolvedValueOnce(user);
    compareMock.mockResolvedValueOnce(true);

    const dto: LoginDto = { email: 'login@example.com', password: 'plain' };
    const out = await service.login(dto);

    expect(prismaUser.findUnique).toHaveBeenCalledWith({
      where: { email: 'login@example.com' },
    });
    expect(compareMock).toHaveBeenCalledWith('plain', 'hashed_pw');
    expect(signSpy).toHaveBeenCalledTimes(1);
    expect(out.access_token).toBe('signed-jwt');
  });

  it('login: throws on password mismatch', async () => {
    const user = makeDbUser({
      id: 'u-login2',
      email: 'login2@example.com',
      password: 'hashed_pw',
    });

    prismaUser.findUnique.mockResolvedValueOnce(user);
    compareMock.mockResolvedValueOnce(false);

    await expect(
      service.login({ email: 'login2@example.com', password: 'bad' }),
    ).rejects.toBeDefined();
  });

  it('login: throws if user not found', async () => {
    prismaUser.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.login({ email: 'none@example.com', password: 'x' }),
    ).rejects.toBeDefined();
  });
});
