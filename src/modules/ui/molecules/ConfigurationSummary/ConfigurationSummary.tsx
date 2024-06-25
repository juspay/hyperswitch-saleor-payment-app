import { Box } from "@saleor/macaw-ui";
import { ChipSuccess, ChipHyperswitchOrange, ChipInfo } from "@/modules/ui/atoms/Chip/Chip";
import { type PaymentAppUserVisibleConfigEntry } from "@/modules/payment-app-configuration/config-entry";
import { getEnvironmentFromKey } from "@/modules/hyperswitch/hyperswitch-api";
import { appBridgeInstance } from "@/app-bridge-instance";

export const ConfigurationSummary = ({ config }: { config: PaymentAppUserVisibleConfigEntry }) => {
  return (
    <Box
      as="dl"
      display="grid"
      __gridTemplateColumns="max-content 1fr"
      rowGap={2}
      columnGap={2}
      alignItems="center"
      margin={0}
    >
      <Box as="dt" marginX={4} fontSize={3} color="default2">
        Environment
      </Box>
      <Box as="dd" marginX={4} textAlign="right">
        {getEnvironmentFromKey(config.publishableKey) === "live" ? (
          <ChipSuccess>LIVE</ChipSuccess>
        ) : (
          <ChipHyperswitchOrange>TESTING</ChipHyperswitchOrange>
        )}
      </Box>
      <Box as="dt" marginX={4} fontSize={3} color="default2">
        Profile ID
      </Box>
      <Box as="dd" marginX={4} textAlign="right" fontSize={3}>
        <a>{config.profileId}</a>
      </Box>
      <Box as="dt" marginX={4} fontSize={3} color="default2">
        Publishable Key
      </Box>
      <Box as="dd" marginX={4} textAlign="right" fontSize={3}>
        <a>{config.publishableKey}</a>
      </Box>
      
    </Box>
  );
};
