import { $Enums, User } from '@prisma/client';

export class UserDto implements User {
  id: string;
  name: string;
  email: string;
  password: string;
  travelType: $Enums.TravelType | null;
  climatePreference: $Enums.ClimatePreference | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
