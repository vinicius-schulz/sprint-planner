import { Component, OnInit } from '@angular/core';

interface EventItem {
  eventType: string;
  description: string;
  date: string;
  duration: number;
  recurring: boolean;
}

interface Developer {
  name: string;
  tipo: string;
  classificacao: number; // valor em porcentagem (ex: 100, 85, etc.)
  maturidade: number;    // valor em porcentagem
  disponibilidade: number;
  capacidade: number;
}

interface Task {
  id: number;
  name: string;
  resource: string;
  sp: string;
  dependencies: string;
  startDate: string;
  endDate: string;
}

interface ConfigItem {
  value1: string;
  value2: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  // Sprint e cálculo geral
  sprintTitle: string = '';
  sprintStartDate: string = '';
  sprintEndDate: string = '';
  totalHorasSprint: number = 0;
  totalCapacityDisplay: number = 0;
  dailyWorkHours: number = 8;

  // Dias não úteis e entrada para dia não útil
  nonWorkingDays: string[] = [];
  nonWorkingDayInput: string = '';

  // Eventos da sprint
  events: EventItem[] = [];

  // Time (membros)
  developers: Developer[] = [];

  // Tarefas
  tasks: Task[] = [];

  // Configurações globais
  classificacoes: ConfigItem[] = [];
  maturities: ConfigItem[] = [];
  spMapping: { sp: string, hours: number }[] = [];
  tipos: { tipo: string, consider: boolean }[] = [];

  // Controle de abas
  activeTab: string = 'dev';

  // Versão da aplicação
  appVersion: string = "calculadora de capacidade scrum - v1.2.5";

  ngOnInit(): void {
    // Valores padrões para classificações
    this.classificacoes = [
      { value1: "Sênior", value2: "100" },
      { value1: "Sênior-Pleno", value2: "85" },
      { value1: "Pleno", value2: "70" },
      { value1: "Júnior-Pleno", value2: "65" },
      { value1: "Júnior", value2: "50" },
      { value1: "Estagiário", value2: "35" }
    ];
    // Valores padrões para maturidade
    this.maturities = [
      { value1: "Plena", value2: "100" },
      { value1: "Mediana", value2: "80" },
      { value1: "Inicial", value2: "60" }
    ];
    // Relação Story Points / Horas
    this.spMapping = [
      { sp: "13", hours: 39 },
      { sp: "8", hours: 24 },
      { sp: "5", hours: 15 },
      { sp: "3", hours: 9 },
      { sp: "2", hours: 6 },
      { sp: "1", hours: 3 },
      { sp: "0", hours: 0 }
    ];
    // Tipos de membro
    this.tipos = [
      { tipo: "Desenvolvedor", consider: true },
      { tipo: "Tester", consider: false }
    ];
    // Adiciona um membro padrão
    this.addDeveloper();
  }

  // --- Métodos para dias não úteis ---
  updateNonWorkingDaysFromDates(): void {
    if (!this.sprintStartDate || !this.sprintEndDate) return;
    const startDate = new Date(this.sprintStartDate);
    const endDate = new Date(this.sprintEndDate);
    if (startDate > endDate) return;
    const autoWeekendDays: string[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        autoWeekendDays.push(currentDate.toISOString().split('T')[0]);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    this.nonWorkingDays = autoWeekendDays;
    this.updateSprintEffectiveHours();
  }

  addNonWorkingDay(): void {
    if (this.nonWorkingDayInput && !this.nonWorkingDays.includes(this.nonWorkingDayInput)) {
      this.nonWorkingDays.push(this.nonWorkingDayInput);
      this.nonWorkingDays.sort();
      this.nonWorkingDayInput = '';
      this.updateSprintEffectiveHours();
    }
  }

  removeNonWorkingDay(day: string): void {
    this.nonWorkingDays = this.nonWorkingDays.filter(d => d !== day);
    this.updateSprintEffectiveHours();
  }

  // --- Métodos para eventos ---
  addEvent(): void {
    const defaultEvent: EventItem = {
      eventType: "Planning",
      description: "",
      date: "",
      duration: 0,
      recurring: false
    };
    this.events.push(defaultEvent);
  }

  removeEvent(index: number): void {
    this.events.splice(index, 1);
    this.updateSprintEffectiveHours();
  }

  // --- Cálculo das horas úteis da sprint ---
  calculateTotalWorkingHours(): number {
    if (!this.sprintStartDate || !this.sprintEndDate) return 0;
    const startDate = new Date(this.sprintStartDate);
    const endDate = new Date(this.sprintEndDate);
    if (startDate > endDate) return 0;
    let workingDays = 0;
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (!this.nonWorkingDays.includes(dateStr)) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    const totalAvailableHours = workingDays * this.dailyWorkHours;
    let totalEventHours = 0;
    this.events.forEach(ev => {
      if (ev.recurring) {
        totalEventHours += (ev.duration / 60) * workingDays;
      } else {
        if (ev.date) {
          const eventDateObj = new Date(ev.date);
          if (eventDateObj >= new Date(this.sprintStartDate) && eventDateObj <= new Date(this.sprintEndDate)) {
            if (!this.nonWorkingDays.includes(ev.date)) {
              totalEventHours += (ev.duration / 60);
            }
          }
        }
      }
    });
    const effectiveHours = totalAvailableHours - totalEventHours;
    return effectiveHours > 0 ? effectiveHours : 0;
  }

  updateSprintEffectiveHours(): void {
    this.totalHorasSprint = this.calculateTotalWorkingHours();
    this.updateCapacity();
  }

  // --- Métodos para desenvolvedores ---
  addDeveloper(): void {
    const newDeveloper: Developer = {
      name: "",
      tipo: this.tipos.length ? this.tipos[0].tipo : "",
      classificacao: 100,
      maturidade: 100,
      disponibilidade: 100,
      capacidade: 0
    };
    this.developers.push(newDeveloper);
  }

  removeDeveloper(index: number): void {
    this.developers.splice(index, 1);
    this.updateCapacity();
  }

  // --- Métodos para Tipos ---
  addTipo(): void {
    this.tipos.push({ tipo: "", consider: true });
  }

  removeTipo(index: number): void {
    this.tipos.splice(index, 1);
    this.updateCapacity();
  }

  // --- Cálculo da capacidade dos desenvolvedores ---
  calcularCapacidadePorDev(availableHours: number, spMapping: { sp: string, hours: number }[]): number {
    let capacity = 0;
    let horaAtual = availableHours;
    while (horaAtual > 0) {
      let repetiu = true;
      for (let i = 0; i < spMapping.length; i++) {
        const requiredHours = spMapping[i].hours;
        const spValue = parseFloat(spMapping[i].sp);
        if (requiredHours > 0 && requiredHours <= horaAtual) {
          horaAtual -= requiredHours;
          capacity += spValue;
          repetiu = false;
          break;
        }
      }
      if (repetiu) {
        if (spMapping.length > 1) {
          capacity += parseFloat(spMapping[spMapping.length - 2].sp);
        } else {
          capacity += parseFloat(spMapping[0].sp);
        }
        horaAtual = 0;
      }
    }
    return capacity;
  }

  updateCapacity(): void {
    const sprintEffectiveHours = this.calculateTotalWorkingHours();
    this.totalHorasSprint = sprintEffectiveHours;
    let totalTeamCapacity = 0;
    this.developers.forEach(dev => {
      const devEffectiveHours = sprintEffectiveHours *
        (dev.disponibilidade / 100) *
        (dev.classificacao / 100) *
        (dev.maturidade / 100);
      let devCapacity = this.calcularCapacidadePorDev(devEffectiveHours, this.spMapping);
      // Se o tipo selecionado não deve ser considerado, capacidade = 0
      const tipoObj = this.tipos.find(t => t.tipo === dev.tipo);
      if (tipoObj && !tipoObj.consider) {
        devCapacity = 0;
      }
      dev.capacidade = devCapacity;
      totalTeamCapacity += devCapacity;
    });
    this.totalCapacityDisplay = totalTeamCapacity;
  }

  // --- Métodos para tarefas ---
  addTask(): void {
    const newId = this.tasks.length + 1;
    const newTask: Task = {
      id: newId,
      name: "",
      resource: "",
      sp: "",
      dependencies: "",
      startDate: "",
      endDate: ""
    };
    this.tasks.push(newTask);
  }

  removeTask(index: number): void {
    const removedTask = this.tasks[index];
    this.tasks.splice(index, 1);
    // Remove dependências de outras tarefas
    this.tasks.forEach(task => {
      let deps = task.dependencies.split(",").map(d => d.trim()).filter(d => d !== "");
      if (deps.includes(String(removedTask.id))) {
        deps = deps.filter(d => d !== String(removedTask.id));
        task.dependencies = deps.join(", ");
      }
    });
  }

  // --- Funções utilitárias para datas ---
  formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  isWorkingDay(date: Date): boolean {
    const dateStr = this.formatDate(date);
    return !this.nonWorkingDays.includes(dateStr);
  }

  getNextWorkingDate(date: Date): Date {
    let d = new Date(date);
    while (!this.isWorkingDay(d)) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  addWorkingDays(date: Date, days: number): Date {
    let d = new Date(date);
    while (days > 0) {
      d.setDate(d.getDate() + 1);
      if (this.isWorkingDay(d)) {
        days--;
      }
    }
    return d;
  }

  getSPMappingObj(): { [key: string]: number } {
    let mapping: { [key: string]: number } = {};
    this.spMapping.forEach(item => {
      if (item.sp !== "" && item.hours !== null) {
        mapping[item.sp] = item.hours;
      }
    });
    return mapping;
  }

  calculateTaskDates(): void {
    if (!this.sprintStartDate) {
      alert("Informe a data de início da sprint.");
      return;
    }
    const sprintStart = new Date(this.sprintStartDate);
    const spMappingObj = this.getSPMappingObj();
    let tasksSorted = [...this.tasks].sort((a, b) => a.id - b.id);
    let resourceDates: { [key: string]: Date } = {};
    tasksSorted.forEach(task => {
      if (!task.resource) {
        task.startDate = "";
        task.endDate = "";
        return;
      }
      if (!resourceDates[task.resource]) {
        resourceDates[task.resource] = new Date(sprintStart);
      }
      let candidate = new Date(resourceDates[task.resource]);
      let deps = task.dependencies.split(",").map(d => d.trim()).filter(d => d !== "");
      deps.forEach(depId => {
        const depTask = tasksSorted.find(t => t.id === +depId);
        if (depTask && depTask.endDate) {
          const depEnd = new Date(depTask.endDate);
          const nextDay = this.addWorkingDays(depEnd, 1);
          if (nextDay > candidate) {
            candidate = nextDay;
          }
        }
      });
      candidate = this.getNextWorkingDate(candidate);
      let durationDays = 1;
      if (task.sp in spMappingObj) {
        const horasNecessarias = spMappingObj[task.sp];
        durationDays = Math.ceil(horasNecessarias / this.dailyWorkHours);
      }
      task.startDate = this.formatDate(candidate);
      const taskEnd = this.addWorkingDays(candidate, durationDays - 1);
      task.endDate = this.formatDate(taskEnd);
      resourceDates[task.resource] = this.addWorkingDays(taskEnd, 1);
    });
  }

  // --- Exportação e Importação de dados ---
  exportData(): void {
    const data = {
      version: this.appVersion,
      sprint: {
        title: this.sprintTitle,
        startDate: this.sprintStartDate,
        endDate: this.sprintEndDate
      },
      nonWorkingDays: this.nonWorkingDays,
      events: this.events,
      teamMembers: this.developers,
      tasks: this.tasks,
      globalSettings: {
        dailyWorkHours: this.dailyWorkHours,
        classificacoes: this.classificacoes,
        maturities: this.maturities,
        spMapping: this.spMapping,
        tipos: this.tipos
      }
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dados.json';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  importData(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        this.sprintTitle = jsonData.sprint.title || "";
        this.sprintStartDate = jsonData.sprint.startDate || "";
        this.sprintEndDate = jsonData.sprint.endDate || "";
        this.nonWorkingDays = jsonData.nonWorkingDays || [];
        this.events = jsonData.events || [];
        this.developers = jsonData.teamMembers || [];
        this.tasks = jsonData.tasks || [];
        this.dailyWorkHours = jsonData.globalSettings.dailyWorkHours || 8;
        this.classificacoes = jsonData.globalSettings.classificacoes || [];
        this.maturities = jsonData.globalSettings.maturities || [];
        this.spMapping = jsonData.globalSettings.spMapping || [];
        this.tipos = jsonData.globalSettings.tipos || [];
        this.updateSprintEffectiveHours();
      } catch (err) {
        alert("Erro ao importar o arquivo: " + err);
      }
    };
    reader.readAsText(file);
  }
}
