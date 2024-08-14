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
import Link from "next/link";
import {
  PaymentAppFormConfigEntry,
  paymentAppFormConfigEntrySchema,
} from "@/modules/payment-app-configuration/common-app-configuration/config-entry";
import { AddJuspayCredentialsForm } from "./AddJuspayCredentialsForm";

export const ConfigurationForm = ({
  configurationId,
  orchestra,
}: {
  configurationId: string | undefined | null;
  orchestra: string;
}) => {
  const { appBridgeState } = useAppBridge();
  const { token } = appBridgeState ?? {};

  const hasPermissions = true || checkTokenPermissions(token, REQUIRED_SALEOR_PERMISSIONS);

  const formMethods = useForm<PaymentAppFormConfigEntry>({
    resolver: zodResolver(paymentAppFormConfigEntrySchema),
    defaultValues: {
      hyperswitchConfiguration: undefined,
      juspayConfiguration: undefined,
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
      <FormProvider {...formMethods}>
        {orchestra === "Juspay" ? (
          <FormProvider {...formMethods}>
            <AppLayoutRow title="Hypercheckout Credentials">
              <AddJuspayCredentialsForm configurationId={configurationId} />
            </AppLayoutRow>
          </FormProvider>
        ) : (
          <FormProvider {...formMethods}>
            <AppLayoutRow title="Hyperswitch Credentials">
              <AddHyperswitchCredentialsForm configurationId={configurationId} />
            </AppLayoutRow>
          </FormProvider>
        )}
      </FormProvider>
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
