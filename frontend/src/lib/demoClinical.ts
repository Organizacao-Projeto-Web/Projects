import type { ClinicalAssessment } from "./types";

// Somente memória da sessão de demonstração. Não persiste nem consulta a API.
const records = new Map<number, ClinicalAssessment[]>();

export function getDemoClinicalAssessments(patientId: number): ClinicalAssessment[] {
  return records.get(patientId) ?? [];
}

export function saveDemoClinicalAssessment(record: ClinicalAssessment) {
  records.set(record.paciente_id, [record, ...getDemoClinicalAssessments(record.paciente_id)]);
}

export function resetDemoClinicalAssessments() {
  records.clear();
}
