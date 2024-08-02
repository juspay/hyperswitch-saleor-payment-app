import { Box, Button, Text } from "@saleor/macaw-ui";
import Link from "next/link";
import {
  RoundedActionBox,
  RoundedBoxWithFooter,
} from "@/modules/ui/atoms/RoundedActionBox/RoundedActionBox";
import { type PaymentAppUserVisibleEntries } from "@/modules/payment-app-configuration/common-app-configuration/app-config";
import { AddConfigButton } from "../../molecules/AddConfigButton/AddConfigButton";
import { ConfigurationsTable } from "../../molecules/ConfigurationsTable/ConfigurationsTable";

export const ConfigurationsList = ({
  configurations,
}: {
  configurations: PaymentAppUserVisibleEntries;
}) => {
  return configurations.length > 0 ? <NotEmpty configurations={configurations} /> : <Empty />;
};

const NotEmpty = ({ configurations }: { configurations: PaymentAppUserVisibleEntries }) => {
  return (
    <RoundedBoxWithFooter footer={<AddConfigButton>Add new configuration</AddConfigButton>}>
      <ConfigurationsTable configurations={configurations} />
    </RoundedBoxWithFooter>
  );
};

const Empty = () => {
  return (
    <RoundedActionBox>
      <Box>
        <Text as="p">No Hyperswitch configurations added.</Text>
        <Text as="p">This means payments are not processed by Hyperswitch.</Text>
      </Box>
      <AddConfigButton>Add new configuration</AddConfigButton>
    </RoundedActionBox>
  );
};
