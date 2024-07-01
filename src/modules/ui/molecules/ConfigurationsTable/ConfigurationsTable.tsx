import { Text, EditIcon, Box, InfoIcon, ViewListIcon, ViewTableIcon } from "@saleor/macaw-ui";
import Link from "next/link";
import { ConfigurationSummary } from "../ConfigurationSummary/ConfigurationSummary";
import * as tableStyles from "./configurationsTable.css";
import { Tr, Td, Table, Tbody, Th, Thead } from "@/modules/ui/atoms/Table/Table";
import { type PaymentAppUserVisibleConfigEntry } from "@/modules/payment-app-configuration/config-entry";
import { type PaymentAppUserVisibleEntries } from "@/modules/payment-app-configuration/app-config";

const ConfigurationsTableRow = ({ item }: { item: PaymentAppUserVisibleConfigEntry }) => {
  return (
    <Tr>
      <Td>
        <Text size={4} fontWeight="regular">
          {item.configurationName}
        </Text>
      </Td>
      <Td className={tableStyles.summaryColumnTd}>
        <ConfigurationSummary config={item} />
      </Td>
      <Td className={tableStyles.actionsColumnTd}>
        <Link href={`/configurations/edit/${item.configurationId}`} passHref legacyBehavior>
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
          <Th className={tableStyles.summaryColumnTd}>Hyperswitch Configuration</Th>
          <Th className={tableStyles.actionsColumnTd}>
            <span className="visually-hidden">Actions</span>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {configurations.map((item) => (
          <ConfigurationsTableRow key={item.configurationId} item={item} />
        ))}
      </Tbody>
    </Table>
  );
};
