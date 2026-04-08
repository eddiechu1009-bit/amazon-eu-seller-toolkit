import { Module, ModuleId } from './types';
import { brandRegistryModule } from './brandRegistry';
import { listingPrepModule } from './listingPrep';
import { fbaInboundModule } from './fbaInbound';
import { postLaunchModule } from './postLaunch';
import { ppcStrategyModule } from './ppcStrategy';
import { promotionsModule } from './promotions';

export const allModules: Module[] = [
  brandRegistryModule,
  listingPrepModule,
  fbaInboundModule,
  postLaunchModule,
  ppcStrategyModule,
  promotionsModule,
];

export const moduleMap: Record<ModuleId, Module> = {
  brand: brandRegistryModule,
  listing: listingPrepModule,
  fba: fbaInboundModule,
  postlaunch: postLaunchModule,
  ppc: ppcStrategyModule,
  promotions: promotionsModule,
};
