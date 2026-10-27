import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MechanicStatus, Role } from '../common/enums';
import { User } from '../users/user.entity';
import { CreateMechanicDto } from './dto/create-mechanic.dto';
import { UpdateMechanicDto } from './dto/update-mechanic.dto';
import { Mechanic } from './mechanic.entity';

@Injectable()
export class MechanicsService {
  constructor(
    @InjectRepository(Mechanic) private readonly repo: Repository<Mechanic>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(dto: CreateMechanicDto) {
    await this.assertEmailIsFree(dto.email);
    const { userId, ...data } = dto;
    const user = userId !== undefined ? await this.resolveTechnician(userId) : null;
    const mechanic = await this.repo.save(this.repo.create({ ...data, user }));
    return this.findOne(mechanic.id);
  }

  findAll() {
    return this.repo.find({ relations: { user: true }, order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const mechanic = await this.repo.findOne({ where: { id }, relations: { user: true } });
    if (!mechanic) throw new NotFoundException(`Mechanic with id ${id} not found`);
    return mechanic;
  }

  async update(id: number, dto: UpdateMechanicDto) {
    const mechanic = await this.findOne(id);
    if (dto.email && dto.email !== mechanic.email) await this.assertEmailIsFree(dto.email);

    const { userId, ...data } = dto;
    Object.assign(mechanic, data);
    if (userId !== undefined && userId !== mechanic.user?.id) {
      mechanic.user = await this.resolveTechnician(userId, id);
    }
    await this.repo.save(mechanic);
    return this.findOne(id);
  }

  /** Activating/inactivating never deletes the mechanic, so their history stays intact. */
  async setStatus(id: number, status: MechanicStatus) {
    const mechanic = await this.findOne(id);
    mechanic.status = status;
    await this.repo.save(mechanic);
    return this.findOne(id);
  }

  private async assertEmailIsFree(email: string) {
    if (await this.repo.exists({ where: { email } })) {
      throw new ConflictException(`A mechanic with email ${email} already exists`);
    }
  }

  private async resolveTechnician(userId: number, currentMechanicId?: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with id ${userId} not found`);
    if (user.role !== Role.TECHNICIAN) throw new BadRequestException(`User ${user.email} is not a TECHNICIAN`);
    const linked = await this.repo.findOne({ where: { user: { id: userId } } });
    if (linked && linked.id !== currentMechanicId) {
      throw new ConflictException(`User ${user.email} is already linked to another mechanic`);
    }
    return user;
  }
}
