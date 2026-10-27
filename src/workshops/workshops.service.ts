import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkshopStatus } from '../common/enums';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { Workshop } from './workshop.entity';

@Injectable()
export class WorkshopsService {
  constructor(@InjectRepository(Workshop) private readonly repo: Repository<Workshop>) {}

  create(dto: CreateWorkshopDto) {
    return this.repo.save(this.repo.create(dto));
  }

  findActive() {
    return this.repo.find({ where: { status: WorkshopStatus.ACTIVE }, order: { id: 'ASC' } });
  }

  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const workshop = await this.repo.findOne({ where: { id } });
    if (!workshop) throw new NotFoundException(`Workshop with id ${id} not found`);
    return workshop;
  }

  async update(id: number, dto: UpdateWorkshopDto) {
    const workshop = await this.findOne(id);
    Object.assign(workshop, dto);
    return this.repo.save(workshop);
  }

  async setStatus(id: number, status: WorkshopStatus) {
    const workshop = await this.findOne(id);
    workshop.status = status;
    return this.repo.save(workshop);
  }
}
