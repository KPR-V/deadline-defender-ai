import { RiskLevel } from './task';

export interface RiskFactors {
  urgencyScore: number;
  effortGapScore: number;
  importanceScore: number;
  dependencyScore: number;
  progressScore: number;
  ignoredReminderScore: number;
}

export interface RiskCalculationResult {
  riskScore: number;
  riskLevel: RiskLevel;
  explanation: string;
  factors: RiskFactors;
}
