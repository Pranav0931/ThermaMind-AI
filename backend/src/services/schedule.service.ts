import { dataStore } from "./dataStore";
import { ScheduleInput } from "../types/domain";

class ScheduleService {
  list() {
    return dataStore.listSchedules();
  }

  create(input: ScheduleInput) {
    return dataStore.createSchedule(input);
  }

  update(id: number, input: Partial<ScheduleInput>) {
    return dataStore.updateSchedule(id, input);
  }

  delete(id: number) {
    return dataStore.deleteSchedule(id);
  }
}

export const scheduleService = new ScheduleService();
