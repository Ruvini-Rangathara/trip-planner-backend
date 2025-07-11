import { PaginatePropsType } from '../types/paginate-props';

class PrismaUtil {
  paginate(paginated: PaginatePropsType) {
    const { page = 1, pageSize = 20, all } = paginated;
    if (all) {
      return undefined;
    }
    return {
      skip: (page - 1) * pageSize,
      take: pageSize,
    };
  }
}

export default new PrismaUtil();
