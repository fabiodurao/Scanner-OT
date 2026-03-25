import React from 'react';
import {
  IconWindmill,
  IconSolarPanel,
  IconBolt,
  IconBuildingFactory2,
  IconLeaf,
  IconFlame,
  IconDroplet,
  IconAtom,
  IconWaveSine,
  IconBattery4,
  IconHome,
  IconBuildingSkyscraper,
  IconSun,
  IconWind,
  IconRipple,
  IconRecycle,
} from '@tabler/icons-react';

interface SiteIconProps {
  size?: number;
  primaryColor: string;
  secondaryColor: string;
  className?: string;
}

export type SiteIconComponent = React.FC<SiteIconProps>;

// Each wrapper just renders the Tabler icon with the primary color
const makeIcon = (Icon: React.FC<{ size?: number; color?: string; className?: string }>): SiteIconComponent =>
  ({ size = 16, primaryColor, className = '' }) => (
    <Icon size={size} color={primaryColor} className={className} />
  );

export const WindTurbineIcon    = makeIcon(IconWindmill);
export const WindOffshoreIcon   = makeIcon(IconWind);      // Changed to IconWind
export const SolarPanelIcon     = makeIcon(IconSolarPanel);
export const BatteryBoltIcon    = makeIcon(IconBattery4);
export const HydropowerIcon     = makeIcon(IconDroplet);
export const BiomassIcon        = makeIcon(IconFlame);
export const BiofuelsIcon       = makeIcon(IconLeaf);
export const HybridIcon         = makeIcon(IconBolt);
export const SubstationIcon     = makeIcon(IconBuildingSkyscraper);
export const EnergyFromWasteIcon = makeIcon(IconBuildingFactory2);
export const GeothermalIcon     = makeIcon(IconFlame);
export const HydrogenIcon       = makeIcon(IconDroplet);
export const SolarThermalIcon   = makeIcon(IconSun);
export const NonEnergyWasteIcon = makeIcon(IconRecycle);   // Changed to IconRecycle
export const NuclearIcon        = makeIcon(IconAtom);
export const WaveIcon           = makeIcon(IconWaveSine);
export const TidalIcon          = makeIcon(IconRipple);    // Changed to IconRipple
export const SolarRooftopIcon   = makeIcon(IconHome);

export const SITE_TYPE_ICONS: Record<string, SiteIconComponent> = {
  eolica:                   WindTurbineIcon,
  eolica_offshore:          WindOffshoreIcon,
  fotovoltaica:             SolarPanelIcon,
  bess:                     BatteryBoltIcon,
  hidreletrica:             HydropowerIcon,
  biomassa:                 BiomassIcon,
  biocombustivel:           BiofuelsIcon,
  hibrida:                  HybridIcon,
  subestacao:               SubstationIcon,
  energia_residuos:         EnergyFromWasteIcon,
  geotermica:               GeothermalIcon,
  hidrogenio:               HydrogenIcon,
  solar_termico:            SolarThermalIcon,
  residuos_nao_energeticos: NonEnergyWasteIcon,
  nuclear:                  NuclearIcon,
  ondas:                    WaveIcon,
  mare:                     TidalIcon,
  solar_telhado:            SolarRooftopIcon,
};