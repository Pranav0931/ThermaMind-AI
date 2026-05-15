import { aiService } from "./ai.service";
import { dataStore } from "./dataStore";
import { ScheduleInput } from "../types/domain";

class ScheduleService {
  list() {
    return dataStore.listSchedules();
  }

  async create(input: ScheduleInput) {
    const schedule = await dataStore.createSchedule(input);
    await this.applyActiveSchedule(input);
    return schedule;
  }

  async update(id: number, input: Partial<ScheduleInput>) {
    const schedule = await dataStore.updateSchedule(id, input);
    if (schedule) {
      await this.applyActiveSchedule({
        zoneId: schedule.zoneId,
        name: schedule.name,
        startTime: schedule.startTime,
        duration: schedule.duration,
        targetTemp: schedule.targetTemp,
        targetHum: schedule.targetHum,
        mode: schedule.mode,
        isActive: schedule.isActive,
      });
    }
    return schedule;
  }

  delete(id: number) {
    return dataStore.deleteSchedule(id);
  }

  private async applyActiveSchedule(input: ScheduleInput) {
    if (input.isActive === false) {
      return;
    }
    const latest = await dataStore.getLatestReading(input.zoneId);
    const optimization = await aiService.optimizeHvac(
      input.zoneId,
      latest ?? {},
      { temperature: input.targetTemp, humidity: input.targetHum },
    );
    await dataStore.updateZoneControls(input.zoneId, {
      targetTemp: input.targetTemp,
      targetHum: input.targetHum,
      fanSpeed: optimization.fanSpeed,
    });
  }
}

export const scheduleService = new ScheduleService();
