/**
 * Phase 28 — V1 Core Creative Mechanisms Repository
 * Total 40 Core Mechanisms across Restaurant, Salon, Real Estate, and Local/Cross-Industry
 */

import type { CreativeMechanism } from '../bank.types';
import { RESTAURANT_MECHANISMS } from './restaurantMechanisms';
import { SALON_MECHANISMS } from './salonMechanisms';
import { REAL_ESTATE_MECHANISMS } from './realEstateMechanisms';
import { LOCAL_CROSS_INDUSTRY_MECHANISMS } from './localCrossIndustryMechanisms';

export const V1_CORE_MECHANISMS: CreativeMechanism[] = [
  ...RESTAURANT_MECHANISMS,
  ...SALON_MECHANISMS,
  ...REAL_ESTATE_MECHANISMS,
  ...LOCAL_CROSS_INDUSTRY_MECHANISMS
];

export function getAllMechanisms(): CreativeMechanism[] {
  return [...V1_CORE_MECHANISMS];
}

export function getMechanismById(id: string): CreativeMechanism | undefined {
  return V1_CORE_MECHANISMS.find((m) => m.id === id || m.id.toLowerCase() === id.toLowerCase());
}

export function getMechanismsByIndustry(industry: string): CreativeMechanism[] {
  const normalized = industry.toLowerCase();
  return V1_CORE_MECHANISMS.filter(
    (m) =>
      m.applicableIndustries.includes('all') ||
      m.applicableIndustries.includes(normalized) ||
      m.applicableIndustries.some((ind) => ind.toLowerCase() === normalized)
  );
}

export {
  RESTAURANT_MECHANISMS,
  SALON_MECHANISMS,
  REAL_ESTATE_MECHANISMS,
  LOCAL_CROSS_INDUSTRY_MECHANISMS
};
