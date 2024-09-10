import { Text, EditIcon, Box, InfoIcon, ViewListIcon, ViewTableIcon } from "@saleor/macaw-ui";
import Link from "next/link";
import {
  HyperswitchConfigurationSummary,
  JuspayConfigurationSummary,
} from "../ConfigurationSummary/ConfigurationSummary";
import * as tableStyles from "./configurationsTable.css";
import { Tr, Td, Table, Tbody, Th, Thead } from "@/modules/ui/atoms/Table/Table";
import { type PaymentAppUserVisibleEntries } from "@/modules/payment-app-configuration/common-app-configuration/app-config";
import { HyperswitchUserVisibleConfigEntry } from "@/modules/payment-app-configuration/hyperswitch-app-configuration/config-entry";
import { JuspayUserVisibleConfigEntry } from "@/modules/payment-app-configuration/juspay-app-configuration/config-entry";
import { invariant } from "@/lib/invariant";

const HyperswitchConfigurationsTableRow = ({
  item,
  configurationName,
  configurationId,
  environment,
}: {
  item: HyperswitchUserVisibleConfigEntry;
  configurationName: string;
  configurationId: string;
  environment: string;
}) => {
  return (
    <Tr>
      <Td>
        <Text size={4} fontWeight="regular">
          {configurationName}
        </Text>
      </Td>
      <Td className={tableStyles.summaryColumnTd}>
        <HyperswitchConfigurationSummary config={item} environment={environment} />
      </Td>
      <Td className={tableStyles.actionsColumnTd}>
        <Link href={`/configurations/edit/hyperswitch/${configurationId}`} passHref legacyBehavior>
          <Text
            as="a"
            size={4}
            color="default2"
            textDecoration="none"
            display="inline-flex"
            alignItems="center"
          >
            <ViewTableIcon size="small" />
            View Config
          </Text>
        </Link>
      </Td>
    </Tr>
  );
};

const JuspayConfigurationsTableRow = ({
  item,
  configurationName,
  configurationId,
  environment,
}: {
  item: JuspayUserVisibleConfigEntry;
  configurationName: string;
  configurationId: string;
  environment: string;
}) => {
  return (
    <Tr>
      <Td>
        <Text size={4} fontWeight="regular">
          {configurationName}
        </Text>
      </Td>
      <Td className={tableStyles.summaryColumnTd}>
        <JuspayConfigurationSummary config={item} environment={environment} />
      </Td>
      <Td className={tableStyles.actionsColumnTd}>
        <Link href={`/configurations/edit/juspay/${configurationId}`} passHref legacyBehavior>
          <Text
            as="a"
            size={4}
            color="default2"
            textDecoration="none"
            display="inline-flex"
            alignItems="center"
          >
            <ViewTableIcon size="small" />
            View Config
          </Text>
        </Link>
      </Td>
    </Tr>
  );
};

export const ConfigurationsTable = ({
  configurations,
}: {
  configurations: PaymentAppUserVisibleEntries;
}) => {
  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Configuration name</Th>
          <Th className={tableStyles.summaryColumnTd}>Hyperswitch/Juspay Configuration</Th>
          <Th className={tableStyles.actionsColumnTd}>
            <span className="visually-hidden">Actions</span>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {configurations.map((item) => {
          if (item.hyperswitchConfiguration) {
            return (
              <HyperswitchConfigurationsTableRow
                key={item.configurationId}
                item={item.hyperswitchConfiguration}
                configurationName={item.configurationName}
                configurationId={item.configurationId}
                environment={item.environment}
              />
            );
          } else {
            invariant(item.juspayConfiguration, "Configuration Not found");
            return (
              <JuspayConfigurationsTableRow
                key={item.configurationId}
                item={item.juspayConfiguration}
                configurationName={item.configurationName}
                configurationId={item.configurationId}
                environment={item.environment}
              />
            );
          }
        })}
      </Tbody>
    </Table>
  );
};
