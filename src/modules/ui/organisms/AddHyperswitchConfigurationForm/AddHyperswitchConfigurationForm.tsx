import { Button, Text } from "@saleor/macaw-ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppBridge } from "@saleor/app-sdk/app-bridge";
import { useForm, FormProvider } from "react-hook-form";
import { AppLayoutRow } from "../../templates/AppLayout";
import { FullPageError } from "../../molecules/FullPageError/FullPageError";
import { AddHyperswitchCredentialsForm } from "./AddHyperswitchCredentialsForm";
import { DeleteHyperswitchConfigurationForm } from "./DeleteHyperswitchConfigurationForm";
import { checkTokenPermissions } from "@/modules/jwt/check-token-offline";
import { REQUIRED_SALEOR_PERMISSIONS } from "@/modules/jwt/consts";
import { trpcClient } from "@/modules/trpc/trpc-client";
import {
  type PaymentAppFormConfigEntry,
  paymentAppFormConfigEntrySchema,
} from "@/modules/payment-app-configuration/config-entry";
import Link from "next/link";


export const HyperswitchConfigurationForm = ({
  configurationId,
}: {
  configurationId: string | undefined | null;
}) => {
  const { appBridgeState } = useAppBridge();
  const { token } = appBridgeState ?? {};

  const hasPermissions = true || checkTokenPermissions(token, REQUIRED_SALEOR_PERMISSIONS);

  const formMethods = useForm<PaymentAppFormConfigEntry>({
    resolver: zodResolver(paymentAppFormConfigEntrySchema),
    defaultValues: {
      publishableKey: "",
      apiKey: "",
      paymentResponseHashKey: "",
      profileId: "",
      configurationName: "",
    },
  });

  const { data } = trpcClient.paymentAppConfigurationRouter.paymentConfig.get.useQuery(
    { configurationId: configurationId! },
    { enabled: !!configurationId },
  );

  if (!hasPermissions) {
    return (
      <FullPageError>
        <Text>{"You don't have permissions to configure this app."}</Text>
      </FullPageError>
    );
  }

  return (
    <FormProvider {...formMethods}>
      <AppLayoutRow
        title="Hyperswitch Credentials"
      >
        <AddHyperswitchCredentialsForm configurationId={configurationId} />
      </AppLayoutRow>
      {data && configurationId && (
        <AppLayoutRow error={true} title="Danger zone">
          <DeleteHyperswitchConfigurationForm
            configurationName={data.configurationName}
            configurationId={configurationId}
          />
        </AppLayoutRow>
      )}
    </FormProvider>
  );
};
