# API

```
openapi: 3.0.0
info:
  title: "{{gatewayName}} API v2"
  version: 2.0.0
  description: |
    Welcome to the <a href="{{siteUrl}}" target="_blank">{{gatewayName}}</a> gateway JSON API.

    You can use our API endpoints to easily and securely charge and credit transactions.

    To use the {{gatewayName}} API, you must have a merchant account and source key from the {{gatewayName}} gateway.

    To create a source key in the gateway, navigate to Control Panel > Source Management > Create Key.

    ### API Base URIs:
    * Production API base URI:

      `{{prodBaseUrl}}/api/v2/`
    * Sandbox API base URI:

      `{{sandboxBaseUrl}}/api/v2/`

    Please use the `User-Agent` header to identify your software, so requests coming from your integration can be traced.
servers:
  - url: "{{prodBaseUrl}}/api/v2"
    description: Production API base URI
  - url: "{{sandboxBaseUrl}}/api/v2"
    description: Sandbox API base URI
paths:
  /transactions/charge:
    post:
      tags:
        - processing-charges
      summary: Charge
      description: |
        Creates a new authorization / charge.
        For credit cards, by default, the authorization will be captured into the current batch.

        A charge can be from one of the following types of sources:
        * Credit Card: This requires passing fields with credit card data.
        * DAF Card: This requires passing fields with DAF card data.
        * Credit Card Magstripe: This requires passing magstripe data from a swiped credit card.
        * Check / ACH
        * Source: This includes charging based on a previous transaction, a stored payment method, a token, or a nonce.
        * Digital Wallet: An encrypted token containing payment data from a digital wallet provider.

        For check transactions, this request requires the Check Charge permission on the source key.
        For CC transactions, if `capture` is `false`, it requires the Auth Only permission,
        otherwise, it requires the Charge permission.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/CreditCardChargeRequest'
                - $ref: '#/components/schemas/DafCardChargeRequest'
                - $ref: '#/components/schemas/MagstripeChargeRequest'
                - $ref: '#/components/schemas/CheckChargeRequest'
                - $ref: '#/components/schemas/SourceChargeRequest'
                - $ref: '#/components/schemas/DigitalWalletChargeRequest'
      responses:
        200:
          description: The authorization was processed successfully.
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/CreditCardResponse'
                  - type: object
                    title: Check Response
                    allOf:
                      - $ref: '#/components/schemas/BaseChargeResponse'
                      - type: object
                        properties:
                          transaction:
                            $ref: '#/components/schemas/CheckTransaction'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /transactions/terminal-charge:
    post:
      tags:
        - processing-charges
      summary: Terminal Charge
      requestBody:
        required: true
        content:
          application/json:
            schema:
              allOf:
                - $ref: '#/components/schemas/BaseCharge'
                - type: object
                  required:
                    - terminal_id
                  properties:
                    terminal_id:
                      type: string
                      minLength: 1
                      description: |
                        The serial number of the terminal.
                        This must match a terminal that is boarded in the gateway.
                    source:
                      type: string
                      description: |
                        The source to charge. This can be a token, a payment method or the reference number of a previous transaction.
                        If this field is not sent, the terminal will prompt for a card.

                        The appropriate prefix must be used:
                        * Reference number: `ref-`
                        * Payment method ID: `pm-`
                        * Token: `tkn-`

                        By default, a source charge sent without an expiration date will use the expiration date saved with the source.
                        If an expiration date is sent, it will override the saved expiration date.

                        AVS fields will be automatically populated when using a payment method source unless overridden in the request.
                      pattern: '(tkn|ref|pm)-[A-Za-z0-9]+'
                      maxLength: 26
                    save_card:
                      type: boolean
                      description: If set to true and the transaction has been approved, the system will issue a token for future use.
                      default: false
      responses:
        200:
          description: The transaction was processed successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreditCardResponse'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /transactions/refund:
    post:
      tags:
        - processing-credit
      summary: Refund
      description: |
        Refund a previously settled charge. An error will be returned if the original transaction has not yet settled.

        This request requires the Refund permission on the source key for CC transactions, and Check Refund for checks.

        ACH transactions can only be refunded after 5 business days have passed since the transaction was processed.

        Terminals with connected refunds will behave as matched refunds.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RefundRequest'
      responses:
        200:
          description: The refund was processed successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RefundResponse'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /transactions/credit:
    post:
      tags:
        - processing-credit
      summary: Credit
      description: |
        Credit money back to a payment method.

        A credit can be to one of 3 different types of sources:
        * Credit Card: This requires passing fields with credit card data.
        * Credit Card Magstripe: This requires passing magstripe data from a swiped credit card.
        * Check
        * Source: This includes crediting based on a previous transaction, a stored payment method, or a token.

        This feature must be enabled by the ISO/MSP.
        It requires the Refund permission on the source key for CC transactions, and Check Refund for checks.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/CreditCardCreditRequest'
                - $ref: '#/components/schemas/MagstripeCreditRequest'
                - $ref: '#/components/schemas/CheckCreditRequest'
                - $ref: '#/components/schemas/SourceCreditRequest'
      responses:
        200:
          description: The credit was processed successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RefundResponse'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /transactions/terminal-credit:
    post:
      tags:
        - processing-credit
      summary: Terminal Credit
      description: |
        Credit money back to a payment method.

        This feature must be enabled by the ISO/MSP.
        It requires the Refund permission on the source key for CC transactions, and Check Refund for checks.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TerminalCreditRequest'
      responses:
        200:
          description: The credit was processed successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RefundResponse'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /transactions/void:
    post:
      tags:
        - processing-credit
      summary: Void
      description: |
        Void a previously unsettled charge. An error will be returned if the original transaction has already been settled.

        This request requires the Void permission on the source key for CC transactions, and Check Void for checks.

        ACH transactions can only be voided until 1am Eastern Time.

        FirstData terminal transactions are host capture and can only be voided within 25 minutes of the transaction.

        TSYS only supports voids on transactions using US or Canadian cards. International cards must use refunds.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VoidRequest'
      responses:
        200:
          description: The void was processed successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VoidResponse'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /transactions/capture:
    post:
      tags:
        - processing-charges
      summary: Capture
      description: |
        Capture an authorization into the current batch.
        If the authorization is already captured, this will still return a successful response.

        Only applicable to credit card authorizations.

        Not supported for terminal transactions.

        This request requires the Capture permission on the source key.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CaptureRequest'
      responses:
        200:
          description: The authorization was captured successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdjustCaptureResponse'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /transactions/reversal:
    post:
      tags:
        - processing-credit
      summary: Reverse
      description: |
        This is a convenience method to completely or partially reverse a previous transaction, regardless of the state which it's currently in.
        It combines the functionality of the `/transactions/adjust`, `/transactions/void`, and `/transactions/refund` endpoints.
        * If no amount is sent:
          - If the transaction is unsettled, it will be voided.
          - If the transaction is settled, it will be completely refunded.
        * If an amount is sent:
          - If the transaction is unsettled, it will be adjusted by reducing it by the amount passed (`amount` is the amount to reduce it by, not the new amount).
            If the amount is the full amount of the authorization, it will be voided.
          - If the transaction is settled, it will be refunded for the amount sent.

        ACH transactions can only be voided until 1am Eastern Time the night after the transaction was processed,
        and can only be refunded after 5 business days have passed since the transaction was processed.

        First Data terminal transactions can only be voided within 25 minutes of the transaction. After that point it will be run as a refund/credit regardless if the transaction is settled.

        Terminal transactions cannot be adjusted, and will always run as a refund if a different amount is sent regardless if the transaction is settled.

        ACH transactions cannot be adjusted, and will return an error if a different amount is sent and they are unsettled.

        This endpoint requires that the source key have a pin, and requires the following permissions on the source key:
        * For CC transactions: Charge, Void, and Refund.
        * For checks: Check Void and Check Refund.

        TSYS only supports voids/adjusts on transactions using US or Canadian cards. International cards must use refunds.

        Terminal full reversals that are processed on a different terminal (by specifying `terminal_id`) will be processed as a refund, instead of an void.

        Terminals with connected refunds will behave as matched refunds.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReversalRequest'
      responses:
        200:
          description: The authorization was reversed successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReversalResponse'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /transactions/adjust:
    post:
      tags:
        - processing-charges
      summary: Adjust
      description: |
        Adjust the amount or details of a previous unsettled transaction.

        This endpoint requires that the source key have a pin.

        The amount of ACH and Terminal transactions cannot be adjusted, and will return an error if a different amount is sent.

        If the original transaction had amount details and this request changes the amount, the `amount_details` must be resent.
        If only details are being adjusted and not the amount, the `amount` field can be omitted.

        This request requires the Adjust permission on the source key.

        TSYS only supports adjusts on transactions using US or Canadian cards.
        International cards must use refunds after the transaction has settled.

        Adjusting a transaction to a higher amount is only permitted by the card brands in specific scenarios.
        It is the the responsibility of the merchant to enforce this.

        A transaction can only be adjusted once.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AdjustRequest'
      responses:
        200:
          description: The authorization was adjusted successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdjustCaptureResponse'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /transactions/adjust-capture:
    post:
      tags:
        - processing-charges
      summary: Adjust and capture
      description: |
        Adjust the amount or details of a previous unsettled transaction, and captures it into the batch.

        This endpoint requires that the source key have a pin.

        This endpoint only applies to credit card transactions, and will return an error for ACH transactions.

        If the original transaction had amount details and this request changes the amount, the `amount_details` must be resent.
        If only details are being adjusted and not the amount, the `amount` field can be omitted.

        This request requires the Capture permission on the source key. If the amount is adjusted, the request will require Adjust permission as well.

        TSYS only supports adjusts on transactions using US or Canadian cards. International cards must use refunds.

        Adjusting a transaction should only be done in a compliant manner and is the responsibility of the merchant.

        A transaction can only be adjusted once.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AdjustRequest'
      responses:
        200:
          description: The authorization was adjusted and captured successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdjustCaptureResponse'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /transactions/queue:
    post:
      tags:
        - processing-charges
      summary: Queue
      description: |
        Removes the authorization from the current open batch and places it into the queue.
        If the authorization is already queued, this will still return a successful response.

        Only applicable to credit card authorizations. This is not supported for terminal transactions.

        This request requires the Capture permission on the source key.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/QueueRequest'
      responses:
        204:
          description: The authorization was queued successfully.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          description: |
            The source key does not have permissions for this endpoint.
            This endpoint required the Capture permission to be set on the source key
        404:
          description: The authorization was not found.
        415:
          $ref: '#/components/responses/415'
        422:
          description: |
            The request could not be processed, possibly for one of the following reasons:
              * The transaction was not a CC transaction or was not an authorization.
              * The authorization was already settled.
              * The authorization was not approved.
  /transactions/verify:
    post:
      tags:
        - processing-charges
      summary: Verification
      description: |
        Verifies that a card number, and optionally AVS and/or CVV2 data, is valid.

        Only applicable to credit card authorizations. This transaction will not be saved in the gateway.

        This request requires the Auth Only permission on the source key.

        For Amex cards, if a CVV2 is sent and an Amex processor is available, it will be used, regardless of processor logic.
        If the only CC processor is a Fiserv (FirstData) platform, the CVV2 might be left out of the verification
        request sent to the processor, since their platforms do not support CVV2 in all situations.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/CreditCardVerificationRequest'
                - $ref: '#/components/schemas/DafCardVerificationRequest'
                - $ref: '#/components/schemas/MagstripeVerificationRequest'
                - $ref: '#/components/schemas/TerminalVerificationRequest'
                - $ref: '#/components/schemas/SourceVerificationRequest'
      responses:
        200:
          description: The verification request was processed successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VerificationResponse'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /transactions:
    get:
      tags:
        - transactions
      summary: Get multiple transactions
      description: Returns an array of transactions
      parameters:
        - $ref: '#/components/parameters/order'
        - $ref: '#/components/parameters/TransactionStatus'
        - $ref: '#/components/parameters/TransactionPaymentType'
        - $ref: '#/components/parameters/TransactionSettledDate'
        - $ref: '#/components/parameters/DateField'
        - $ref: '#/components/parameters/dateFrom'
        - $ref: '#/components/parameters/dateTo'
        - $ref: '#/components/parameters/limit'
        - $ref: '#/components/parameters/offset'
        - $ref: '#/components/parameters/key'
      responses:
        200:
          description: The transactions were returned successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Transaction'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
  /transactions/{id}:
    get:
      tags:
        - transactions
      summary: Get a single transaction
      description: Returns a single transaction by reference number
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The transaction ID.
      responses:
        200:
          description: The transaction was returned successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Transaction'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The transaction was not found.
  /surcharge:
    post:
      tags:
        - surcharge
      summary: Get the surcharge settings for a specific payment source
      description: |
        Returns the surcharge that will be automatically applied when processing a transaction using the specified payment source (e.g. a card number).
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SourceSurchargeRequest'
      responses:
        200:
          description: The surcharge details were returned successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SourceSurchargeResponse'
        400:
          description: The request was invalid.
        401:
          $ref: '#/components/responses/401'
        404:
          description: Surcharge details were not found.
    get:
      tags:
        - surcharge
      summary: Get the surcharge settings
      responses:
        200:
          description: The surcharge details were returned successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SurchargeSettingsResponse'
        400:
          description: The request was invalid.
        401:
          $ref: '#/components/responses/401'
        404:
          description: Surcharge details were not found.
  /saved-cards:
    post:
      tags:
        - saved-cards
      summary: Save a card number
      description: |
        Save a card number for future use. A token will be returned, which can be used later in place of a card number.

        This will not verify that the card is valid.
        It is recommended to instead use a [Verification request](#tag/processing-charges/paths/~1transactions~1verify/post),
        and set the `save_card` property to `true`. This will run a Verification transaction to verify that the card is valid,
        and return a token in the response.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/CreateSavedCardRequest'
                - $ref: '#/components/schemas/CreateSourceSavedCardRequest'
      responses:
        200:
          description: The card was saved successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreateSavedCardResponse'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /saved-cards/{cardRef}:
    patch:
      tags:
        - saved-cards
      summary: Update a saved card
      description: Updates a saved card's expiration by Card Ref
      parameters:
        - in: path
          name: cardRef
          required: true
          schema:
            type: string
            minimum: 1
          description: The card ref.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateSavedCard'
      responses:
        200:
          description: The saved card was updated successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpdateSavedCardResonse'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The saved card was not found.
  /batches:
    get:
      tags:
        - batches
      summary: Get all batches
      description: Returns a paginated list of all batches.
      parameters:
        - $ref: '#/components/parameters/order'
        - in: query
          name: status
          schema:
            type: string
            enum: [open, closed]
          description: The status of the batch.
        - $ref: '#/components/parameters/dateFrom'
        - $ref: '#/components/parameters/dateTo'
        - $ref: '#/components/parameters/limit'
        - $ref: '#/components/parameters/offset'
      responses:
        200:
          description: The batches were retrieved successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Batch'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
  /batches/{id}:
    get:
      tags:
        - batches
      summary: Get a single batch
      description: Get a single batch by batch ID.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The batch ID.
      responses:
        200:
          description: The batch was retrieved successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Batch'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The batch was not found.
  /batches/{id}/transactions:
    get:
      tags:
        - batches
      summary: Get transactions for a batch
      description: Get the transactions in the specified batch.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The batch ID.
        - $ref: '#/components/parameters/order'
        - $ref: '#/components/parameters/TransactionStatus'
        - $ref: '#/components/parameters/TransactionPaymentType'
        - $ref: '#/components/parameters/TransactionSettledDate'
        - $ref: '#/components/parameters/DateField'
        - $ref: '#/components/parameters/dateFrom'
        - $ref: '#/components/parameters/dateTo'
        - $ref: '#/components/parameters/limit'
        - $ref: '#/components/parameters/offset'
      responses:
        200:
          description: The transactions were retrieved successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Transaction'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The batch was not found.
  /customers:
    get:
      tags:
        - customers
      summary: Get multiple customers
      description: Returns an array of customers
      parameters:
        - $ref: '#/components/parameters/order'
        - $ref: '#/components/parameters/limit'
        - $ref: '#/components/parameters/offset'
        - in: query
          name: active
          schema:
            type: boolean
          description: The status of the customer.
        - in: query
          name: customer_number
          schema:
            type: string
          description: The `customer_number` of the customer.
      responses:
        200:
          description: The customers were returned successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Customer'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
    post:
      tags:
        - customers
      summary: Create a customer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewCustomer'
      responses:
        201:
          description: The customer was created successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Customer'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        415:
          $ref: '#/components/responses/415'
  /customers/create-from-transaction:
    post:
      tags:
        - customers
      summary: Create a customer from a transaction
      description: |
        This will create a new customer using the information from the referenced transaction.
        A payment method can subsequently be created using the transaction as the source.
        Any field provided in the body will override the data from the transaction.
        A new customer will be created even if the transaction is already linked to an existing customer.
        If the transaction is not already linked to a customer, it will be linked to the newly created customer.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewCustomerFromTransaction'
      responses:
        201:
          description: The customer was created successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Customer'
        400:
          description: The body was invalid.
        401:
          $ref: '#/components/responses/401'
        404:
          description: The transaction was not found.
        415:
          $ref: '#/components/responses/415'
  /customers/{id}:
    get:
      tags:
        - customers
      summary: Get a single customer
      description: Returns a single customers by ID number
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The customer ID.
      responses:
        200:
          description: The customer was returned successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Customer'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The customer was not found.
    patch:
      tags:
        - customers
      summary: Update a customer
      description: Updates a single customer by ID number
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The customer ID.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BaseCustomer'
      responses:
        200:
          description: The customer was updated successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Customer'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The customer was not found.
    delete:
      tags:
        - customers
      summary: Delete a customer
      description: Delete a single customer by customer ID.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The customer ID.
      responses:
        204:
          description: The customer was deleted successfully.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The customer was not found.
        409:
          description: The customer is linked to active recurring schedules.
  /customers/{id}/payment-methods:
    get:
      tags:
        - customers
      summary: Get payment methods for a customer
      description: Returns the payment methods for the specified customer
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The customer ID.
      responses:
        200:
          description: The payment methods were returned successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  oneOf:
                    - $ref: '#/components/schemas/CreditCardPaymentMethod'
                    - $ref: '#/components/schemas/CheckPaymentMethod'
                    - $ref: '#/components/schemas/DafCardPaymentMethod'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The customer was not found.
    post:
      tags:
        - customers
      summary: Create a payment method
      description: Creates a payment method for the specified customer.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The customer ID.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/NewCreditCardPaymentMethod'
                - $ref: '#/components/schemas/NewCheckPaymentMethod'
                - $ref: '#/components/schemas/NewDafCardPaymentMethod'
                - $ref: '#/components/schemas/NewPaymentMethodFromSource'
      responses:
        201:
          description: The payment method was created successfully.
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/CreditCardPaymentMethod'
                  - $ref: '#/components/schemas/CheckPaymentMethod'
                  - $ref: '#/components/schemas/DafCardPaymentMethod'

        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The customer was not found.
        409:
          description: A payment method with these details already exists for this customer.
          content:
            application/json:
              schema:
                type: object
                properties:
                  error_message:
                    type: string
                    enum: ["Invalid state error"]
                  error_details:
                    type: object
                    properties:
                      error:
                        type: string
                        enum: ["A payment method with these details already exists for this customer"]
                      payment_method:
                        oneOf:
                          - $ref: '#/components/schemas/CreditCardPaymentMethod'
                          - $ref: '#/components/schemas/CheckPaymentMethod'
        415:
          $ref: '#/components/responses/415'
  /customers/{id}/recurring-schedules:
    get:
      tags:
        - customers
      summary: Get recurring schedules for a customer
      description: Returns the recurring schedules for the specified customer
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The customer ID.
      responses:
        200:
          description: The recurring schedules were returned successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Schedule'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The customer was not found.
    post:
      tags:
        - customers
      summary: Create a recurring schedule
      description: Creates a recurring schedule for the specified customer.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The customer ID.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewSchedule'
      responses:
        201:
          description: The recurring schedule was created successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Schedule'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The customer was not found.
        415:
          $ref: '#/components/responses/415'
  /customers/{id}/transactions:
    get:
      tags:
        - customers
      summary: Get transactions for a customer
      description: Get the transactions for the specified customer.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The customer ID.
        - $ref: '#/components/parameters/order'
        - $ref: '#/components/parameters/TransactionStatus'
        - $ref: '#/components/parameters/TransactionPaymentType'
        - $ref: '#/components/parameters/TransactionSettledDate'
        - $ref: '#/components/parameters/DateField'
        - $ref: '#/components/parameters/dateFrom'
        - $ref: '#/components/parameters/dateTo'
        - $ref: '#/components/parameters/limit'
        - $ref: '#/components/parameters/offset'
      responses:
        200:
          description: The transactions were retrieved successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Transaction'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The customer was not found.
  /payment-methods:
    get:
      tags:
        - payment-methods
      summary: Get all payment methods
      description: Returns a paginated list of all payment methods.
      parameters:
        - $ref: '#/components/parameters/order'
        - $ref: '#/components/parameters/limit'
        - $ref: '#/components/parameters/offset'
      responses:
        200:
          description: The payment methods were retrieved successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  oneOf:
                    - $ref: '#/components/schemas/CreditCardPaymentMethod'
                    - $ref: '#/components/schemas/CheckPaymentMethod'
                    - $ref: '#/components/schemas/DafCardPaymentMethod'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
  /payment-methods/{id}:
    get:
      tags:
        - payment-methods
      summary: Get a single payment method
      description: Get a single payment method by payment method ID.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The payment method ID.
      responses:
        200:
          description: The payment method was retrieved successfully.
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/CreditCardPaymentMethod'
                  - $ref: '#/components/schemas/CheckPaymentMethod'
                  - $ref: '#/components/schemas/DafCardPaymentMethod'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The payment method was not found.
    patch:
      tags:
        - payment-methods
      summary: Update a payment method
      description: Updates a payment method by ID number
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The payment method ID.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/BaseCreditCardPaymentMethod'
                - $ref: '#/components/schemas/BaseCheckPaymentMethod'
                - $ref: '#/components/schemas/BaseDafCardPaymentMethod'
      responses:
        200:
          description: The payment method was updated successfully.
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/CreditCardPaymentMethod'
                  - $ref: '#/components/schemas/CheckPaymentMethod'
                  - $ref: '#/components/schemas/DafCardPaymentMethod'

        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The payment method was not found.
    delete:
      tags:
        - payment-methods
      summary: Delete a payment method
      description: Delete a single payment method by payment method ID.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The payment method ID.
      responses:
        204:
          description: The payment method was deleted successfully.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The payment method was not found.
        409:
          description: The payment method is linked to active recurring schedules.
  /payment-methods/{id}/recurring-schedules:
    get:
      tags:
        - payment-methods
      summary: Get recurring schedules for a payment method
      description: Returns the recurring schedules for the specified payment method
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The payment method ID.
      responses:
        200:
          description: The recurring schedules were returned successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Schedule'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The payment method was not found.
  /recurring-schedules:
    get:
      tags:
        - recurring-schedules
      summary: Get all recurring schedules
      description: Returns a paginated list of all recurring schedules.
      parameters:
        - $ref: '#/components/parameters/order'
        - $ref: '#/components/parameters/limit'
        - $ref: '#/components/parameters/offset'
      responses:
        200:
          description: The recurring schedules were retrieved successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Schedule'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
  /recurring-schedules/{id}:
    get:
      tags:
        - recurring-schedules
      summary: Get a single recurring schedule
      description: Get a single recurring schedules by ID.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The recurring schedule ID.
      responses:
        200:
          description: The recurring schedule was retrieved successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Schedule'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
        404:
          description: The recurring schedule was not found.
    patch:
      tags:
        - recurring-schedules
      summary: Update a recurring schedule
      description: Updates a recurring schedule by ID number
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The recurring schedule ID.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateSchedule'
      responses:
        200:
          description: The recurring schedule was updated successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Schedule'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
        404:
          description: The recurring schedule was not found.
    delete:
      tags:
        - recurring-schedules
      summary: Delete a recurring schedule
      description: Delete a single recurring schedule by ID.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The recurring schedule ID.
      responses:
        204:
          description: The recurring schedule was deleted successfully.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
        404:
          description: The recurring schedule was not found.
  /recurring-schedules/{id}/transactions:
    get:
      tags:
        - recurring-schedules
      summary: Get transactions for a recurring schedule
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The recurring schedule ID.
        - $ref: '#/components/parameters/order'
        - $ref: '#/components/parameters/TransactionStatus'
        - $ref: '#/components/parameters/TransactionPaymentType'
        - $ref: '#/components/parameters/TransactionSettledDate'
        - $ref: '#/components/parameters/DateField'
        - $ref: '#/components/parameters/dateFrom'
        - $ref: '#/components/parameters/dateTo'
        - $ref: '#/components/parameters/limit'
        - $ref: '#/components/parameters/offset'
      responses:
        200:
          description: The transactions were retrieved successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Transaction'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
        404:
          description: The recurring schedule was not found.
  /products:
    get:
      tags:
        - products
      summary: Get products
      description: Returns a list of all products.
      parameters:
        - $ref: '#/components/parameters/order'
        - $ref: '#/components/parameters/limit'
        - $ref: '#/components/parameters/offset'
        - in: query
          name: selected_fields
          schema:
            type: array
            items:
              type: string
          explode: false
          description: An array of fields to return. Defaults to all available fields. Multiple values can be sent, separated by commas.
        - in: query
          name: filter_fields
          schema:
            type: array
            items:
              type: string
          explode: false
          description: |
            An array of fields to search, used together with `filter_string`. Defaults to all selected fields.
            Multiple values can be sent, separated by commas.
        - in: query
          name: filter_string
          schema:
            type: string
          description: The string to search for in all fields specified in filter_fields.
        - in: query
          name: category_id
          schema:
            type: array
            items:
              type: integer
          explode: false
          description: An array of category ids to filter products by. Defaults to all categories. Multiple values can be sent, separated by commas.
      responses:
        200:
          description: Product list was retrieved successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Product'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
    post:
      tags:
        - products
      summary: Create a new product
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewProduct'
      responses:
        201:
          description: Product was created successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
  /products/{id}:
    get:
      tags:
        - products
      summary: Get a single product
      description: Returns the requested product.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The product ID.
      responses:
        200:
          description: product was retrieved successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The product was not found.
    patch:
      tags:
        - products
      summary: Update a product
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The product ID.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BaseProduct'
      responses:
        200:
          description: Product was updated successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The product was not found.
    delete:
      tags:
        - products
      summary: Delete a product
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The product ID.
      responses:
        204:
          description: Product was deleted successfully.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The product was not found.
        409:
          description: This product is in use by an invoice, and cannot be deleted.
  /products/categories:
    get:
      tags:
        - categories
      summary: Get all categories
      description: Returns a list of all product categories.
      parameters:
        - $ref: '#/components/parameters/order'
        - $ref: '#/components/parameters/limit'
        - $ref: '#/components/parameters/offset'
        - in: query
          name: parent_id
          schema:
            type: integer
          description: For subcategories, set this field to the parent category Id.
      responses:
        200:
          description: Category list was retrieved successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Category'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
    post:
      tags:
        - categories
      summary: Create a new category
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewCategory'
      responses:
        201:
          description: Category was created successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Category'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        409:
          description: A category already exists with the same name.
  /products/categories/{id}:
    get:
      tags:
        - categories
      summary: Get a single category
      description: Returns the requested category.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The category ID.
      responses:
        200:
          description: category was retrieved successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Category'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The category was not found.
    patch:
      tags:
        - categories
      summary: Update a category
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The category ID.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BaseCategory'
      responses:
        200:
          description: Category was updated successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Category'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The category was not found.
        409:
          description: A category already exists with the same name.
    delete:
      tags:
        - categories
      summary: Delete a category
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The category ID.
      responses:
        204:
          description: Category was deleted successfully.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The category was not found.
        409:
          description: The category contains products, and cannot be deleted.
  /invoices:
    get:
      tags:
        - invoices
      summary: Get all invoices
      description: Returns a list of invoices.
      parameters:
        - $ref: '#/components/parameters/order'
        - in: query
          name: order_by
          schema:
            type: string
            enum: [id,number,created,customer,due,amount,status]
            default: id
            description: The column to order by.
        - $ref: '#/components/parameters/limit'
        - $ref: '#/components/parameters/offset'
        - in: query
          name: selected_fields
          schema:
            type: array
            items:
              type: string
          explode: false
          description: An array of fields to return. Defaults to all available fields. Multiple values can be sent, separated by commas.
        - in: query
          name: product_id
          schema:
            type: integer
          description: A product ID to filter by.
        - in: query
          name: customer_ids
          schema:
            type: array
            items:
              type: integer
          explode: false
          description: The customer ID(s) to filter by. Multiple values can be sent, separated by commas.
        - in: query
          name: statuses
          schema:
            type: array
            items:
              type: string
              enum: [canceled,paid,partially paid,sent,viewed,authorized,saved]
          explode: false
          description: The invoice status(es) to filter by. Multiple values can be sent, separated by commas.
        - in: query
          name: amount
          schema:
            type: number
          description: Filter invoices by amount.
        - in: query
          name: number
          schema:
            type: string
          description: Filter invoices by invoice number.
        - in: query
          name: due_date
          schema:
            type: string
            format: date
          description: Filter invoices by due date.
        - in: query
          name: created_date
          schema:
            type: string
            format: date
          description: 'Filter invoices by created date. (Note: this is not the invoice date).'
      responses:
        200:
          description: Invoice list was retrieved successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Invoice'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
    post:
      tags:
        - invoices
      summary: Create a new invoice
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewInvoice'
      responses:
        200:
          description: Invoice was created successfully, but there were other failures with the request.
          content:
            application/json:
              schema:
                type: object
                properties:
                  messages:
                    type: array
                    items:
                      type: string
                    description: A list of messages describing the failures.
                  invoice_id:
                    type: integer
                    description: The newly created invoice ID.
        201:
          description: Invoice was created successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Invoice'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
  /invoices/{id}:
    get:
      tags:
        - invoices
      summary: Get a single invoice
      description: Returns the requested invoice.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The invoice ID.
      responses:
        200:
          description: Invoice was retrieved successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Invoice'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
        404:
          description: The invoice was not found.
    patch:
      tags:
        - invoices
      summary: Update an invoice
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The invoice ID.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BaseInvoice'
      responses:
        200:
          description: Invoice was updated successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Invoice'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
        404:
          description: The invoice was not found.
        422:
          description: The invoice cannot be updated once it has been paid or cancelled.
    delete:
      tags:
        - invoices
      summary: Delete an invoice
      description: An invoice can only be deleted before a payment is made.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The invoice ID.
      responses:
        204:
          description: Invoice was deleted successfully.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
        404:
          description: The invoice was not found.
        422:
          description: The invoice cannot be deleted.
  /invoices/{id}/send:
    post:
      tags:
        - invoices
      summary: Send an existing invoice
      description: An invoice can only be sent before a payment is made. Once a payment is made, you must use the Request final payment endpoint.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The invoice ID.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InvoiceEmailInfo'
      responses:
        204:
          description: Invoice was sent successfully.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
        404:
          description: The invoice was not found.
        422:
          description: The invoice cannot be sent.
  /invoices/{id}/cancel:
    post:
      tags:
        - invoices
      summary: Cancel an existing invoice
      description: An invoice can only be canceled once it is sent, but before a payment is made.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The invoice ID.
      responses:
        204:
          description: Invoice was canceled successfully.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
        404:
          description: The invoice was not found.
        422:
          description: The invoice cannot be canceled.
  /invoices/{id}/reactivate:
    post:
      tags:
        - invoices
      summary: Reactivate a canceled invoice
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The invoice ID.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              allOf:
                - $ref: '#/components/schemas/InvoiceEmailInfo'
                - type: object
                  properties:
                    subject:
                      type: string
                      default: Reactivated Invoice {invoice_number} from {merchant_company}
      responses:
        204:
          description: Invoice was reactivated successfully.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
        404:
          description: The invoice was not found.
        422:
          description: The invoice cannot be reactivated because it has not been canceled.
  /invoices/{id}/request-final:
    post:
      tags:
        - invoices
      summary: Request final payment for an invoice
      description: Final payment can only be requested for an active invoice that is partially paid.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The invoice ID.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InvoiceEmailInfo'
      responses:
        204:
          description: Payment request was sent successfully.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        403:
          $ref: '#/components/responses/403'
        404:
          description: The invoice was not found.
        422:
          description: The request cannot be sent.
  /apple-pay/session:
    post:
      tags:
        - apple-session
      summary: Get an Apple Pay session
      description: |
        Use this endpoint to get an Apple Pay session before processing an Apple Pay transaction.

        This endpoint must be called from the browser, and requires a public API key (begins with `pk_`).
      security:
        - BasicAuthenticationPublic: []
      responses:
        200:
          description: Successfully retrieved Apple Session.
          content:
            application/json:
              schema:
                type: object
                description: Opaque Apple Pay session. Pass this directly to `completeMerchantValidation()`.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        500:
          description: There was an error retrieving an Apple Session
  /webhooks:
    get:
      tags:
        - webhooks
      summary: Get webhooks
      description: Returns a list of all webhooks.
      responses:
        200:
          description: Webhook list was retrieved successfully.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Webhook'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
    post:
      tags:
        - webhooks
      summary: Create a new webhook
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewWebhook'
      responses:
        201:
          description: Webhook was created successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Webhook'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        409:
          description: A webhook with these details already exists for this merchant.
    delete:
      tags:
        - webhooks
      summary: Delete a webhook
      description: Delete a single webhook by ID.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The webhook ID.
      responses:
        204:
          description: The webhook method was deleted successfully.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The webhook was not found.
  /webhooks/{id}:
    get:
      tags:
        - webhooks
      summary: Get a single webhook
      description: Returns a single webhook by webhook ID.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The webhook ID.
      responses:
        200:
          description: The webhook was returned successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Webhook'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The webhook was not found.
    patch:
      tags:
        - webhooks
      summary: Update a webhook
      description: Updates a single webhook by ID.
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
            minimum: 1
          description: The webhook ID.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BaseWebhook'
      responses:
        200:
          description: The webhook was updated successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Webhook'
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The webhook was not found.
  /payment-pages/generate-pay-link/{slug}:
    post:
      tags:
        - payment-pages
      parameters:
        - in: path
          name: slug
          required: true
          schema:
            type: string
          description: The payment page slug.
      summary: Generate a payment link
      description: |
        Generate a payment link by pre-filling a payment page with the specified fields. A URL containing these pre-filled details will be returned.
        If the `one_time_use` property is set to true, a unique tracking key is included in the response to monitor the payment status.

        **Note:** If any fields in the request body do not exist on the payment page, a 400 error will be returned.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GeneratePayLinkRequest'
      responses:
        200:
          description: Payment link was generated, but there were other failures with the request.
          content:
            application/json:
              schema:
                type: object
                properties:
                  messages:
                    type: array
                    items:
                      type: string
                    description: A list of messages describing the failures.
                  payment_link:
                    type: string
                    description: The generated payment link.
                  key:
                    type: string
                    description: A unique, one-time-use token tied to this payment link. It is submitted with the transaction when the link is used and returned in the transaction response, allowing you to track whether the link was used and associate it with the resulting payment.
        201:
          description: Payment link was successfully generated.
          content:
            application/json:
              schema:
                type: object
                properties:
                  payment_link:
                    type: string
                    description: The generated payment link.
                  key:
                    type: string
                    description: A unique, one-time-use token tied to this payment link. It is submitted with the transaction when the link is used and returned in the transaction response, allowing you to track whether the link was used and associate it with the resulting payment.
        400:
          $ref: '#/components/responses/400'
        401:
          $ref: '#/components/responses/401'
        404:
          description: The payment page was not found.
        415:
          $ref: '#/components/responses/415'
security:
  - BasicAuthentication: []
tags:
  - name: processing-charges
    x-displayName: Charges
  - name: processing-credit
    x-displayName: Credit
  - name: surcharge
    x-displayName: Surcharge
  - name: transactions
    x-displayName: Transactions
  - name: saved-cards
    x-displayName: Saved cards
  - name: batches
    x-displayName: Batches
  - name: customers
    x-displayName: Customers
  - name: payment-methods
    x-displayName: Payment Methods
    description: Payment Methods are stored credit cards or bank account information.
  - name: recurring-schedules
    x-displayName: Recurring Schedules
  - name: products
    x-displayName: Products
  - name: categories
    x-displayName: Categories
  - name: invoices
    x-displayName: Invoices
  - name: apple-session
    x-displayName: Apple Pay Session
  - name: webhooks
    x-displayName: Webhooks
  - name: payment-pages
    x-displayName: Payment Pages
x-tagGroups:
  - name: Transaction processing
    tags:
      - processing-charges
      - processing-credit
      - surcharge
  - name: Batches and Transactions
    tags:
      - batches
      - transactions
  - name: Saved cards
    tags:
      - saved-cards
  - name: Customers
    tags:
      - customers
      - payment-methods
      - recurring-schedules
  - name: Invoicing
    tags:
      - products
      - categories
      - invoices
  - name: Apple Pay Integration
    tags:
      - apple-session
  - name: Webhooks
    tags:
      - webhooks
  - name: Payment Pages
    tags:
      - payment-pages
components:
  securitySchemes:
    BasicAuthentication:
      type: http
      scheme: basic
      description: |
        <a href="https://en.wikipedia.org/wiki/Basic_access_authentication" target="_blank">Basic authentication</a>
        is a simple authentication scheme built into the HTTP protocol.
        The client sends each HTTP request with an `Authorization` header that contains the word `Basic`,
        followed by a space and a base64-encoded string with the username and password (if applicable) joined by a colon (i.e. `username:password`).

        For this API, the username is the source key and the password is the pin (if applicable) (i.e. `SOURCE_KEY:PIN`).
        If the source key does not have a pin, just append the colon (i.e. `SOURCE_KEY:`).

        For example, to authenticate with a source key of `ABCDEFGHIJKLMNOP` and a pin of `123456`, the client would send the following header:

        `Authorization: Basic QUJDREVGR0hJSktMTU5PUDoxMjM0NTY=`

        Many HTTP client libraries have features that simplify authenticating with Basic auth.
    BasicAuthenticationPublic:
      type: http
      scheme: basic
      description: |
        <a href="https://en.wikipedia.org/wiki/Basic_access_authentication" target="_blank">Basic authentication</a>
        is a simple authentication scheme built into the HTTP protocol.
        The client sends each HTTP request with an `Authorization` header that contains the word `Basic`,
        followed by a space and a base64-encoded string with the username and password (if applicable) joined by a colon (i.e. `username:password`).

        For this API endpoint, the username is the **public** source key (i.e. `pk_SOURCE_KEY:`).

        For example, to authenticate with a public source key of `pk_ABCDEFGHIJKLMNOP`, the client would send the following header:

        `Authorization: Basic cGtfQUJDREVGR0hJSktMTU5PUDo=`

        Many HTTP client libraries have features that simplify authenticating with Basic auth.
  responses:
    400:
      description: The request was invalid or missing required fields.
    401:
      description: Credentials are missing or invalid.
    403:
      description: You do not have permission to access this feature.
    415:
      description: \'Content-Type' must be 'application/json'.
  parameters:
    order:
      in: query
      name: order
      schema:
        type: string
        enum: [asc, desc]
        default: asc
      description: The sort order.
    TransactionStatus:
      in: query
      name: status
      schema:
        type: array
        items:
          type: string
          enum: [captured, pending, reserve, originated, returned, cancelled, queued, declined, error, settled, voided, approved, blocked, expired]
      explode: false
      description: The transaction status(es) to filter by. Multiple values can be sent, separated by commas.
    TransactionPaymentType:
      in: query
      name: payment_type
      schema:
        type: array
        items:
          type: string
          enum: [credit_card, check]
      explode: false
      description: The transaction payment type(s) to filter by. Multiple values can be sent, separated by commas.
    TransactionSettledDate:
      in: query
      name: settled_date
      schema:
        type: string
        format: date
      description: |
        The settled date in UTC to filter for.
        This will exclude transactions processed more than 30 days before the specified settlement date,
        regardless of the `date_from` query parameter.
    DateField:
      in: query
      name: date_field
      schema:
        type: string
        enum: [settled_at, created_at]
        default: created_at
      description: The date event to filter by. This field only has an effect when combined with `date_from` and `date_to` filters
    dateFrom:
      in: query
      name: date_from
      schema:
        oneOf:
          - type: integer
            description: The UNIX epoch, which is an integer value representing the number of milliseconds since January 1, 1970, 00:00:00 UTC.
            minimum: 0
          - type: string
            format: date-time
      description: The earliest date to search. This will be rounded down to the beginning of the day in UTC.
    dateTo:
      in: query
      name: date_to
      schema:
        oneOf:
          - type: integer
            description: The UNIX epoch, which is an integer value representing the number of milliseconds since January 1, 1970, 00:00:00 UTC.
            minimum: 0
          - type: string
            format: date-time
      description: The latest date to search. This will be rounded up to the end of the day in UTC.
    limit:
      in: query
      name: limit
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 10
      description: The maximum number of results to return.
    offset:
      in: query
      name: offset
      schema:
        type: integer
        minimum: 0
      description: The 0-based offset to start from.
    key:
      in: query
      name: key
      schema:
        type: string
      description: The transaction key to filter by.
  schemas:
    Address:
      type: object
      properties:
        first_name:
          type: string
          maxLength: 255
        last_name:
          type: string
          maxLength: 255
        street:
          type: string
          maxLength: 255
        street2:
          type: string
          maxLength: 255
        state:
          type: string
          maxLength: 255
        city:
          type: string
          maxLength: 255
        zip:
          type: string
          maxLength: 50
        country:
          type: string
          maxLength: 255
          description: |
            For the Country Blocker fraud module, use the 2-letter
            [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) country code for best results.
        phone:
          type: string
          maxLength: 255
    CustomFields:
      type: object
      properties:
        custom1:
          type: string
          maxLength: 255
        custom2:
          type: string
          maxLength: 255
        custom3:
          type: string
          maxLength: 255
        custom4:
          type: string
          maxLength: 255
        custom5:
          type: string
          maxLength: 255
        custom6:
          type: string
          maxLength: 255
        custom7:
          type: string
          maxLength: 255
        custom8:
          type: string
          maxLength: 255
        custom9:
          type: string
          maxLength: 255
        custom10:
          type: string
          maxLength: 255
        custom11:
          type: string
          maxLength: 255
        custom12:
          type: string
          maxLength: 255
        custom13:
          type: string
          maxLength: 255
        custom14:
          type: string
          maxLength: 255
        custom15:
          type: string
          maxLength: 255
        custom16:
          type: string
          maxLength: 255
        custom17:
          type: string
          maxLength: 255
        custom18:
          type: string
          maxLength: 255
        custom19:
          type: string
          maxLength: 255
        custom20:
          type: string
          maxLength: 255
    AmountDetails:
      type: object
      description: |
        Breakdown of the amount. These fields do not affect the actual transaction amount and are for reporting and Level 3 only.
        The gateway will not validate that these numbers are correct.

        Calculation Guidelines:
        * `tax` is used for the current transaction. If `tax` is not supplied, it will be calculated from the `tax_percent`.
        * `tax_percent` is used for recharges / adjusting transactions in the Virtual Terminal. If `tax_percent` is not supplied, it will be calculated.
      properties:
        tax:
          type: number
          minimum: 0
          maximum: 20000000
          description: |
            Amount of `amount` field that is for tax.

            To ensure consistency, tax should be calculated as follows: `tax = (subtotal - discount + shipping) * tax_percent`

            Important: Surcharge amounts are not considered taxable and must be excluded from the taxable subtotal.
        tax_percent:
          type: number
          minimum: 0
          description: The tax rate applied to the `subtotal - discount + shipping`, where subtotal refers to the amount before applying any of the values listed in `amount_details`.
        surcharge:
          type: number
          minimum: 0
          maximum: 20000000
          description: |
            Amount of `amount` field that is for surcharge.
            This field (and the `amount` field) will be overwritten if the ISO/MSP sets a mandatory surcharge.
            For a terminal transaction that has a compliant surcharge set, this amount will be set to 0.
        shipping:
          type: number
          minimum: 0
          maximum: 20000000
          description: Amount of `amount` field that is for shipping.
        tip:
          type: number
          minimum: 0
          maximum: 20000000
          description: Amount of `amount` field that is for a tip.
        discount:
          type: number
          minimum: 0
          maximum: 20000000
          description: Amount of discount that was applied.
    BaseTransactionCustomer:
      type: object
      properties:
        send_receipt:
          type: boolean
          description: Whether to send a receipt to the customer.
          default: false
        email:
          type: string
          format: emails
          maxLength: 255
          description: Multiple emails can be sent as a comma-delimited string.
        fax:
          type: string
          maxLength: 255
        identifier:
          type: string
          maxLength: 255
          description: |
            Something that identifies the customer, e.g. the customer's name or company.
            This will not link the transaction to an existing customer.
    CustomerId:
      type: object
      properties:
        customer_id:
          type: integer
          minimum: 1
          description: |
            Send a customer ID in this field to link the transaction to an existing customer.
            This will not affect the `identifier` field.

            If the customer cannot be found, it will be ignored.

            For source charges using `ref-` or `pm-`, this will default to the customer of the source
            transaction / payment method. Set this field to override the default.
    BaseTransactionDetails:
      type: object
      description: Additional optional transaction details.
      properties:
        description:
          type: string
          maxLength: 65535
        clerk:
          type: string
          description: Identifies the clerk that processed the transaction.
          maxLength: 255
        terminal:
          type: string
          description: Identifies the terminal that processed the transaction.
          maxLength: 255
        key:
          type: string
          readOnly: true
          description: A unique, single-use token associated with this transaction. It is returned when a payment is completed through a one-time payment link page.
          maxLength: 255
        client_ip:
          type: string
          description: IP address of the client/customer.
          maxLength: 255
        signature:
          type: string
          format: byte
          description: Base64-encoded JPEG signature.
          maxLength: 65535
    ExtendedTransactionDetails:
      type: object
      properties:
        invoice_number:
          type: string
          maxLength: 255
        po_number:
          type: string
          maxLength: 255
          description: The purchase order number.
        order_number:
          type: string
          description: Order number
          maxLength: 255
    3D-Secure:
      type: object
      properties:
        3d_secure:
          type: object
          description: |
            Data for 3D-Secure (Verified by Visa, MasterCard SecureCode, Amex SafeKey, Discover ProtectBuy).
            These values come from a 3rd party 3D-Secure provider.

            Note: 3D-Secure is only applicable for e-Commerce merchants. Only 3D-Secure version 2 is supported.
          properties:
            eci:
              type: string
              enum: ['00', '01', '02', '05', '06', '07']
              description: Electronic Commerce Indicator (ECI) value.
              minLength: 2
              maxLength: 2
            cavv:
              type: string
              format: byte
              description: (Cardholder) Authentication Verification Value (CAVV / AVV).
              minLength: 28
              maxLength: 80
            ds_trans_id:
              type: string
              format: uuid
              description: |
                Directory Server Transaction ID received from 3rd party provider.
                Only used for MasterCard transactions.
              minLength: 36
              maxLength: 36
    TransactionFlags:
      description: |
        These flags provide more details about the transaction.
        Although they are optional, is recommended they be sent, to ensure optimal approval rates.
      type: object
      properties:
        allow_partial_approval:
          type: boolean
          description: |
            If set to true, this will allow the authorization to be approved for a partial amount,
            if it cannot be approved for the full amount requested.
            If set to false and the authorization cannot be approved for the full amount, it will be declined.

            For TSYS, when `is_recurring` or `is_installment` is `true`, this flag will be ignored,
            and partial approvals will be considered declines.
          default: false
        is_recurring:
          type: boolean
          description: |
            For recurring transactions.

            Recurring transactions (but not installments) with Fiserv (First Data) require that
            AVS data be sent with the initial transaction.

            This field will be ignored unless the transaction is a Source Charge.
          default: false
        is_installment:
          type: boolean
          description: |
            For recurring transactions where there is an end date or set number of transactions.

            E.g. Making payments on a purchase is installments, so `is_installment` should be set to `true`.
            Paying a gym membership is recurring but not installments,
            so `is_recurring` should be set to `true`, but `is_installment` should be left `false`.

            Setting this flag to `true` implies `is_recurring` is also `true`.

            Discover installments with Fiserv (First Data) require that the CVV2 be sent for the initial transaction.

            This field will be ignored unless the transaction is a Source Charge.
          default: false
        is_customer_initiated:
          type: boolean
          description: |
            Whether this transaction was initiated by the customer.
            This field will be ignored unless the transaction is a Source Charge.
          default: false
        cardholder_present:
          type: boolean
          description: |
            Whether the cardholder is present for the transaction.
            This field will be ignored for a Magstripe Charge or if `card_present` is set to true.
          default: false
        card_present:
          type: boolean
          description: |
            Whether the card is present for the transaction.
            This field will be ignored for a Magstripe Charge.
          default: false
        terminal:
          type: object
          properties:
            operating_environment:
              type: number
              enum: [0, 1, 2, 3, 4, 5, 6]
              description: |
                The terminal's location and whether it is attended by the merchant:
                  * `0` - No terminal used; Postauth; Mastercard recurring/installment transactions
                  * `1` - On merchant premises; attended terminal
                  * `2` - On merchant premises; unattended terminal
                  * `3` - Off merchant premises; attended
                  * `4` - Off merchant premises; unattended
                  * `5` - On cardholder premises; unattended
                  * `6` - Off cardholder premises; unattended
              default: 1
            cardholder_authentication_method:
              type: string
              enum: ['0', '2', '5', '6', 'S']
              description: |
                The method used for verifying the cardholder's identity:
                  * `0` - Not authenticated
                  * `2` - Electronic signature analysis
                  * `5` - Manual signature verification
                  * `6` - Other manual verification (such as a driverâ€™s license number)
                  * `S` - Other systematic verification
              default: '0'
            cardholder_authentication_entity:
              type: number
              enum: [0, 2, 4, 5]
              description: |
                The entity that verified the cardholder identity reported in `cardholder_authentication_method`:
                  * `0` - Not authenticated
                  * `2` - Card acceptance device (e.g. terminal or website)
                  * `4` - Merchant - signature
                  * `5` - Other
              default: 0
            print_capability:
              type: boolean
              description: If the terminal has the ability to print messages.
              default: false
    AvsFields:
      type: object
      properties:
        avs_address:
          type: string
          description: Billing address for the card.
          maxLength: 255
        avs_zip:
          type: string
          description: |
            Billing zip code for the card.

            While not required, this field should be populated for fraud prevention and to obtain the best rate for E-commerce credit card transactions.
          maxLength: 50
    AdditionalCardNotPresentFields:
      type: object
      properties:
        expiry_month:
          type: integer
          minimum: 1
          maximum: 12
          description: Card expiration month. If using a card token, send any valid month.
        expiry_year:
          type: integer
          minimum: 2020
          maximum: 9999
          description: Card expiration year. If using a card token, send any valid year.
        cvv2:
          type: string
          pattern: '^\d+$'
          minLength: 3
          maxLength: 4
          description: |
            Security code, otherwise known as CVC or CID.
            For Amex, this is the 4 digit code on the front of the card.
            For other card brands, this is the 3 digit code on the back.

            While not required, this field should be populated for fraud prevention.
    AdditionalCheckFields:
      type: object
      properties:
        routing_number:
          type: string
          minLength: 9
          maxLength: 9
          pattern: '^\d{9}$'
        account_number:
          type: string
          pattern: '^\d+$'
          maxLength: 17
          description: Bank account number
        account_type:
          type: string
          enum: [checking, savings]
          default: checking
        sec_code:
          description: Will default to the default SEC code set by the ISO/MSP.
          type: string
          enum: [PPD, CCD, TEL, WEB]
    Item:
      type: object
      properties:
        sku:
          type: string
          maxLength: 12
          description: Product ID, code or SKU
        name:
          type: string
          maxLength: 64
          description: Item name or short description
        description:
          type: string
          maxLength: 255
          description: Long description
        cost:
          type: number
          minimum: 0.0001
          description: Cost of item per unit of measure (before tax or discount)
        quantity:
          type: integer
          minimum: 1
          description: Quantity of units
        tax_rate:
          type: number
          description: Tax rate percentage for the item. If not submitted, this will be calculated based on `tax_amount`.
          minimum: 0
          maximum: 30
        tax_amount:
          type: number
          minimum: 0
          description: Amount of tax charge for the item. If not submitted, this will be calculated based on `tax_rate`.
        unit_of_measure:
          type: string
          minLength: 2
          maxLength: 3
          description: Code for unit of measure. If left blank or an invalid code is sent, `EA` (Each) will be used.
        commodity_code:
          type: string
          minLength: 8
          maxLength: 8
          description: Commodity code. See https://www.unspsc.org/ for valid list of codes.
        discount_rate:
          type: number
          minimum: 0
          maximum: 100
          description: Discount percentage for the item. If not submitted, this will be calculated based on `discount_amount`.
        discount_amount:
          type: number
          minimum: 0
          description: Discount amount for the item. If not submitted, this will be calculated based on `discount_rate`.
    ChargeRequest:
      type: object
      allOf:
        - $ref: '#/components/schemas/BaseCharge'
        - type: object
          properties:
            transaction_flags:
              $ref: '#/components/schemas/TransactionFlags'
    BaseCharge:
      type: object
      required:
        - amount
      properties:
        amount:
          type: number
          minimum: 0.01
          maximum: 20000000
          description: |
            Transaction amount in USD.

            If a mandatory surcharge is set by the ISO/MSP, the actual amount charged could be different than the
            amount submitted in this field. The revised amounts will be returned in the response.

            The [`/surcharge`](#tag/surcharge) endpoints can be used to check the surcharge before processing.
            The surcharge will also be returned by the Hosted Tokenization library.
        amount_details:
          $ref: '#/components/schemas/AmountDetails'
        name:
          type: string
          description: Name on payment method (credit card or check).
          maxLength: 255
        transaction_details:
          allOf:
            - $ref: '#/components/schemas/BaseTransactionDetails'
            - $ref: '#/components/schemas/ExtendedTransactionDetails'
        line_items:
          type: array
          items:
            $ref: '#/components/schemas/Item'
          minItems: 1
          description: |
            Line item details for Level 3 data.

            The data will not be checked for accuracy, e.g. if the totals add up correctly.

            To qualify for Level 3 VISA Transactions:

            A - The total transaction amount must be equal to the sum total of all items (unit cost Ã— quantity â€“ discount + tax).

            B - The tax amount of the transaction must be equal to the sum total of all item tax amounts.

            The following fields are required for Level 3 data:
            * `sku`,
            * `description`,
            * `cost`,
            * `quantity`,
            * `tax_rate` or `tax_amount`,
        billing_info:
          $ref: '#/components/schemas/Address'
        shipping_info:
          description: For level 3, the country must be in ISO 3166-1 alpha-2 format (2 letter code) and the zip code format must match the country.
          allOf:
            - $ref: '#/components/schemas/Address'
        custom_fields:
          $ref: '#/components/schemas/CustomFields'
        ignore_duplicates:
          type: boolean
          description: Determines whether to override any duplicate transactions detection.
          default: false
        customer:
          allOf:
            - $ref: '#/components/schemas/BaseTransactionCustomer'
            - $ref: '#/components/schemas/CustomerId'
    CreditCardChargeRequest:
      title: Credit Card Charge
      allOf:
        - $ref: '#/components/schemas/ChargeRequest'
        - $ref: '#/components/schemas/AvsFields'
        - $ref: '#/components/schemas/AdditionalCardNotPresentFields'
        - $ref: '#/components/schemas/3D-Secure'
        - type: object
          required:
            - card
            - expiry_month
            - expiry_year
          properties:
            card:
              type: string
              pattern: '^\d+$'
              description: Card number
              minLength: 14
              maxLength: 16
            capture:
              type: boolean
              description: Whether to capture the authorization into the current batch.
              default: true
            save_card:
              type: boolean
              description: If set to true and the transaction has been approved, the system will issue a token for future use.
              default: false
    DafCardChargeRequest:
      title: DAF Card Charge
      allOf:
        - $ref: '#/components/schemas/ChargeRequest'
        - $ref: '#/components/schemas/AdditionalCardNotPresentFields'
        - type: object
          required:
            - card
            - expiry_month
            - expiry_year
            - source
          properties:
            card:
              type: string
              pattern: '^\d+$'
              description: Card number
              minLength: 14
              maxLength: 16
            source:
                type: string
                enum: [pledger, donors_fund, ojc]
                description: The DAF Processor
    MagstripeChargeRequest:
      title: Credit Card Magstripe Charge
      allOf:
        - $ref: '#/components/schemas/ChargeRequest'
        - $ref: '#/components/schemas/AvsFields'
        - type: object
          required:
            - magstripe
          properties:
            magstripe:
              type: string
              description: Magstripe data
            capture:
              type: boolean
              description: Whether to capture the authorization into the current batch.
              default: true
            save_card:
              type: boolean
              description: If set to true and the transaction has been approved, the system will issue a token for future use.
              default: false
    CheckChargeRequest:
      title: Check / ACH Charge
      allOf:
        - $ref: '#/components/schemas/ChargeRequest'
        - $ref: '#/components/schemas/AdditionalCheckFields'
        - type: object
          required:
            - routing_number
            - account_number
            - name
    SourceChargeRequest:
      title: Source Charge
      allOf:
        - $ref: '#/components/schemas/ChargeRequest'
        - $ref: '#/components/schemas/AvsFields'
        - $ref: '#/components/schemas/AdditionalCardNotPresentFields'
        - $ref: '#/components/schemas/3D-Secure'
        - type: object
          required:
            - source
          properties:
            source:
              type: string
              description: |
                The source to charge. This can be a token, nonce token or the reference number of a previous transaction.

                The appropriate prefix must be used:
                * Reference number: `ref-`
                * Payment method ID: `pm-`
                * Token: `tkn-`
                * Nonce token: `nonce-`

                By default, a source charge sent without an expiration date will use the expiration date saved with the source.
                If an expiration date is sent, it will override the saved expiration date.
                Nonce tokens are not stored with an expiration date, so the expiration date must be sent in this request.

                AVS fields will be automatically populated when using a payment method source unless overridden in the request.

                Any extra payment method fields sent with a source (e.g. CVV or routing number) will be ignored.
              pattern: '(tkn|nonce|ref|pm)-[A-Za-z0-9]+'
              maxLength: 26
            sec_code:
              type: string
              enum: [PPD, CCD, TEL, WEB]
              description: SEC code. This field can be used to override the default SEC code set on an ACH payment method.
            capture:
              type: boolean
              description: Whether to capture the authorization into the current batch.
              default: true
            save_card:
              type: boolean
              description: |
                If set to true and the transaction has been approved, the system will issue a token for future use.

                This can only be used with a token or a nonce token. If this is used with a token and expiration info is supplied, the token expiration will be updated.
              default: false
    DigitalWalletChargeRequest:
      title: Digital Wallet Charge
      allOf:
        - $ref: '#/components/schemas/ChargeRequest'
        - $ref: '#/components/schemas/AvsFields'
        - $ref: '#/components/schemas/3D-Secure'
        - type: object
          required:
            - source
            - token
          properties:
            source:
              type: string
              description: |
                The digital wallet to charge.

                Currently supported wallets
                * Apple Pay (`applepay`)
                * Google Pay (`googlepay`)

              pattern: '(googlepay|applepay)'
              maxLength: 26
            token:
              oneOf:
                - type: object
                - type: string
              description: An object or string containing encrypted payment data
            capture:
              type: boolean
              description: Whether to capture the authorization into the current batch.
              default: true
            save_card:
              type: boolean
              description: If set to `true` and the transaction has been approved, the system will issue a token for future use.
              default: false
    RefundRequest:
      type: object
      required:
        - reference_number
      properties:
        reference_number:
          type: integer
          minimum: 1
          description: Reference number of the transaction to refund.
        terminal_id:
          type: string
          description: |
            The serial number of the terminal.
            This must match a terminal that is boarded in the gateway.

            By default the refund transaction will process on the terminal that the original transaction was processed on.
            To specify a different terminal, this field can be set.
        amount:
          type: number
          minimum: 0.01
          maximum: 20000000
          description: Amount of original transaction to refund. Omit this field to refund the full amount.
        cvv2:
          type: string
          pattern: '^\d+$'
          minLength: 3
          maxLength: 4
          description: |
            Security code, otherwise known as CVC or CID.
            For Amex, this is the 4 digit code on the front of the card.
            For other card brands, this is the 3 digit code on the back.

            While not required, this field should be populated for fraud prevention.
        customer:
          $ref: '#/components/schemas/BaseTransactionCustomer'
        transaction_details:
          $ref: '#/components/schemas/BaseTransactionDetails'
        transaction_flags:
          $ref: '#/components/schemas/TransactionFlags'
        custom_fields:
          $ref: '#/components/schemas/CustomFields'
    CreditCardCreditRequest:
      title: Credit with Credit Card Number
      allOf:
        - $ref: '#/components/schemas/AvsFields'
        - $ref: '#/components/schemas/AdditionalCardNotPresentFields'
        - type: object
          required:
            - card
            - expiry_month
            - expiry_year
            - amount
          properties:
            name:
              type: string
              description: Name on card
              maxLength: 255
            card:
              type: string
              pattern: '^\d+$'
              description: Card number
              minLength: 14
              maxLength: 16
            amount:
              type: number
              minimum: 0.01
              maximum: 20000000
              description: Amount to credit.
            customer:
              allOf:
                - $ref: '#/components/schemas/BaseTransactionCustomer'
                - $ref: '#/components/schemas/CustomerId'
            transaction_details:
              allOf:
                - $ref: '#/components/schemas/BaseTransactionDetails'
                - $ref: '#/components/schemas/ExtendedTransactionDetails'
            transaction_flags:
              $ref: '#/components/schemas/TransactionFlags'
            custom_fields:
              $ref: '#/components/schemas/CustomFields'
    MagstripeCreditRequest:
      title: Credit with Magstripe
      allOf:
        - $ref: '#/components/schemas/AvsFields'
        - type: object
          required:
            - magstripe
            - amount
          properties:
            magstripe:
              type: string
              description: Magstripe data
            amount:
              type: number
              minimum: 0.01
              maximum: 20000000
              description: Amount to credit.
            save_card:
              type: boolean
              description: If set to true and the transaction has been approved, the system will issue a token for future use.
              default: false
            customer:
              allOf:
                - $ref: '#/components/schemas/BaseTransactionCustomer'
                - $ref: '#/components/schemas/CustomerId'
            transaction_details:
              allOf:
                - $ref: '#/components/schemas/BaseTransactionDetails'
                - $ref: '#/components/schemas/ExtendedTransactionDetails'
            transaction_flags:
              $ref: '#/components/schemas/TransactionFlags'
            custom_fields:
              $ref: '#/components/schemas/CustomFields'
    TerminalCreditRequest:
      title: Credit with Terminal
      allOf:
        - type: object
          required:
            - terminal_id
            - amount
          properties:
            terminal_id:
              type: string
              description: |
                The serial number of the terminal.
                This must match a terminal that is boarded in the gateway.
            amount:
              type: number
              minimum: 0.01
              maximum: 20000000
              description: Amount to credit.
            source:
              type: string
              description: |
                The source to credit. This can be a token, a payment method, or the reference number of a previous transaction. If a
                reference number is sent, it will only be used to retrieve the account number, but the original
                transaction will not be affected.

                If this field is not sent, the terminal will prompt for a card.

                The appropriate prefix must be used:
                * Reference number: `ref-`
                * Payment method ID: `pm-`
                * Token: `tkn-`

                By default, a source credit sent without an expiration date will use the expiration date saved with the source.
                If an expiration date is sent, it will override the saved expiration date.

                AVS fields will be automatically populated when using a payment method source unless overridden in the request.

                By default, a source credit sent without an expiration date will use the expiration date saved with the source.
                If an expiration date is sent, it will override the saved expiration date.

                Any extra payment method fields sent with a source (e.g. CVV or routing number) will be ignored.
              pattern: '(tkn|ref|pm)-[A-Za-z0-9]+'
              maxLength: 26
            customer:
              allOf:
                - $ref: '#/components/schemas/BaseTransactionCustomer'
                - $ref: '#/components/schemas/CustomerId'
            transaction_details:
              allOf:
                - $ref: '#/components/schemas/BaseTransactionDetails'
                - $ref: '#/components/schemas/ExtendedTransactionDetails'
            custom_fields:
              $ref: '#/components/schemas/CustomFields'
    CheckCreditRequest:
      title: Check / ACH Credit
      allOf:
        - $ref: '#/components/schemas/AdditionalCheckFields'
        - type: object
          required:
            - name
            - routing_number
            - account_number
            - amount
          properties:
            name:
              type: string
              description: Name on check
              maxLength: 255
            amount:
              type: number
              minimum: 0.01
              maximum: 20000000
              description: Amount to credit.
            customer:
              allOf:
                - $ref: '#/components/schemas/BaseTransactionCustomer'
                - $ref: '#/components/schemas/CustomerId'
            transaction_details:
              allOf:
                - $ref: '#/components/schemas/BaseTransactionDetails'
                - $ref: '#/components/schemas/ExtendedTransactionDetails'
            transaction_flags:
              $ref: '#/components/schemas/TransactionFlags'
            custom_fields:
              $ref: '#/components/schemas/CustomFields'
    SourceCreditRequest:
      title: Source Credit
      allOf:
        - $ref: '#/components/schemas/AvsFields'
        - type: object
          required:
            - source
            - amount
          properties:
            source:
              type: string
              description: |
                The source to credit. This can be a token or the reference number of a previous transaction. If a
                reference number is sent, it will only be used to retrieve the account number, but the original
                transaction will not be affected.

                The appropriate prefix must be used:
                * Reference number: `ref-`
                * Payment method ID: `pm-`
                * Token: `tkn-`

                By default, a source credit sent without an expiration date will use the expiration date saved with the source.
                If an expiration date is sent, it will override the saved expiration date.

                Any extra payment method fields sent with a source (e.g. CVV or routing number) will be ignored.
              pattern: '(tkn|ref|pm)-[A-Za-z0-9]+'
              maxLength: 20
            amount:
              type: number
              minimum: 0.01
              maximum: 20000000
              description: Amount to credit.
            customer:
              allOf:
                - $ref: '#/components/schemas/BaseTransactionCustomer'
                - $ref: '#/components/schemas/CustomerId'
            transaction_details:
              allOf:
                - $ref: '#/components/schemas/BaseTransactionDetails'
                - $ref: '#/components/schemas/ExtendedTransactionDetails'
            sec_code:
              type: string
              enum: [PPD, CCD, TEL, WEB]
              description: SEC code. This field can be used to override the default SEC code set on an ACH payment method.
            transaction_flags:
              $ref: '#/components/schemas/TransactionFlags'
            custom_fields:
              $ref: '#/components/schemas/CustomFields'
    VoidRequest:
      type: object
      required:
        - reference_number
      properties:
        reference_number:
          type: integer
          minimum: 1
          description: Reference number of the transaction to void.
        customer:
          $ref: '#/components/schemas/BaseTransactionCustomer'
        transaction_details:
          $ref: '#/components/schemas/BaseTransactionDetails'
    CaptureRequest:
      type: object
      required:
        - reference_number
      properties:
        reference_number:
          type: integer
          minimum: 1
          description: Reference number of the authorization to capture.
    ReversalRequest:
      type: object
      required:
        - reference_number
      properties:
        reference_number:
          type: integer
          minimum: 1
          description: Reference number of the transaction to reverse.
        terminal_id:
          type: string
          description: |
            The serial number of the terminal.
            This must match a terminal that is boarded in the gateway.

            By default the reversal transaction will process on the terminal that the original transaction was processed on.
            To specify a different terminal, this field can be set.

            If a different terminal is set, a void will run as a refund.
        amount:
          type: number
          minimum: 0.01
          maximum: 20000000
          description: Amount of original transaction to reverse.
        customer:
          $ref: '#/components/schemas/BaseTransactionCustomer'
        transaction_details:
          $ref: '#/components/schemas/BaseTransactionDetails'
    AdjustRequest:
      type: object
      required:
        - reference_number
      properties:
        reference_number:
          type: integer
          minimum: 1
          description: Reference number of the transaction to adjust.
        amount:
          type: number
          minimum: 0.01
          maximum: 20000000
          description: Amount to adjust the original transaction to.
        customer:
          $ref: '#/components/schemas/BaseTransactionCustomer'
        transaction_details:
          allOf:
            - $ref: '#/components/schemas/BaseTransactionDetails'
            - $ref: '#/components/schemas/ExtendedTransactionDetails'
        amount_details:
          $ref: '#/components/schemas/AmountDetails'
        billing_info:
          $ref: '#/components/schemas/Address'
        shipping_info:
          $ref: '#/components/schemas/Address'
        custom_fields:
          $ref: '#/components/schemas/CustomFields'
        line_items:
          type: array
          items:
            $ref: '#/components/schemas/Item'
          minItems: 1
          description: |
            Line item details for Level 3 data.

            The data will not be checked for accuracy, e.g. if the totals add up correctly.

            To qualify for Level 3, the line item amounts must match the transaction amounts.

            The new data will replace the old data.
    QueueRequest:
      type: object
      required:
        - reference_number
      properties:
        reference_number:
          type: integer
          minimum: 1
          description: Reference number of the authorization to queue.
    BaseVerificationRequest:
      allOf:
        - $ref: '#/components/schemas/AvsFields'
        - type: object
          properties:
            name:
              type: string
              description: Name on card
              maxLength: 255
            transaction_details:
              $ref: '#/components/schemas/BaseTransactionDetails'
            save_card:
              type: boolean
              description: If set to true and the transaction has been approved, the system will issue a token for future use.
              default: false
            transaction_flags:
              $ref: '#/components/schemas/TransactionFlags'
    CreditCardVerificationRequest:
      title: Credit Card Verification Request
      allOf:
        - $ref: '#/components/schemas/BaseVerificationRequest'
        - $ref: '#/components/schemas/AdditionalCardNotPresentFields'
        - $ref: '#/components/schemas/3D-Secure'
        - type: object
          required:
            - card
            - expiry_month
            - expiry_year
          properties:
            card:
              type: string
              pattern: '^\d+$'
              description: Card number
              minLength: 14
              maxLength: 16
    MagstripeVerificationRequest:
      title: Magstripe Verification Request
      allOf:
        - $ref: '#/components/schemas/BaseVerificationRequest'
        - type: object
          required:
            - magstripe
          properties:
            magstripe:
              type: string
              description: Magstripe data
    TerminalVerificationRequest:
      title: Terminal Verification Request
      allOf:
        - type: object
          required:
            - terminal_id
          properties:
            terminal_id:
              type: string
            transaction_details:
              $ref: '#/components/schemas/BaseTransactionDetails'
    SourceVerificationRequest:
      title: Source Verification Request
      allOf:
        - $ref: '#/components/schemas/BaseVerificationRequest'
        - type: object
          required:
            - source
            - expiry_month
            - expiry_year
          properties:
            source:
              type: string
              pattern: 'nonce-[A-Za-z0-9]+'
              description: |
                A nonce is a one-time use token that is used to minimize PCI scope.
                Once the nonce is used for a transaction, it will expire.
              minLength: 26
              maxLength: 26
            expiry_month:
              type: integer
              minimum: 1
              maximum: 12
              description: Card expiration month
            expiry_year:
              type: integer
              minimum: 2020
              maximum: 9999
              description: Card expiration year
    DafCardVerificationRequest:
      title: DAF Verification Request
      allOf:
        - $ref: '#/components/schemas/BaseVerificationRequest'
        - $ref: '#/components/schemas/AdditionalCardNotPresentFields'
        - type: object
          required:
            - card
            - source
            - expiry_month
            - expiry_year
          properties:
            card:
              type: string
              pattern: '^\d+$'
              description: Card number
              minLength: 14
              maxLength: 16
            source:
              type: string
              enum: [pledger, donors_fund, ojc]
              description: The DAF Processor
    BaseCreateSavedCardRequest:
      type: object
      properties:
        expiry_month:
          type: integer
          minimum: 1
          maximum: 12
          description: Card expiration month
        expiry_year:
          type: integer
          minimum: 2020
          maximum: 9999
          description: Card expiration year
    CreateSavedCardRequest:
      title: Create Saved Card From Card Number
      allOf:
        - type: object
          required:
            - card
            - expiry_month
            - expiry_year
          properties:
            card:
              type: string
              pattern: '^\d+$'
              description: Card number
              minLength: 14
              maxLength: 16
        - $ref: '#/components/schemas/BaseCreateSavedCardRequest'
    CreateSourceSavedCardRequest:
      title: Create Saved Card From Source
      allOf:
        - type: object
          required:
            - source
          properties:
            source:
              type: string
              description: |
                The source to save. This can be a nonce token or the reference number of a previous transaction.

                The appropriate prefix must be used:
                * Reference number: `ref-`
                * Payment method ID: `pm-`
                * Nonce token: `nonce-`

                By default, a source sent without an expiration date will use the expiration date saved with the source.
                If an expiration date is sent, it will override the saved expiration date.
                Nonce tokens are not stored with an expiration date, so the expiration date must be sent in this request.
              pattern: '(nonce|ref|pm)-[A-Za-z0-9]+'
              maxLength: 26
        - $ref: '#/components/schemas/BaseCreateSavedCardRequest'
    UpdateSavedCard:
      type: object
      properties:
        expiry_month:
          type: integer
          minimum: 1
          maximum: 12
          description: Card expiration month
        expiry_year:
          type: integer
          minimum: 2020
          maximum: 9999
          description: Card expiration year
    Result:
      description: Status of the transaction.
      type: string
      enum: [Approved, Partially Approved, Submitted, Declined, Error]
    ResultCode:
      type: string
      enum:
        - A
        - P
        - D
        - E
    AvsResultCode:
      type: string
      enum:
        - YYY
        - YYX
        - NYZ
        - YYW
        - YNA
        - NNN
        - XXU
        - XXR
        - XXS
        - GGG
        - NNC
        - NA
      description: |
        - `YYY`: Address: Match & 5 Digit Zip: Match
        - `YYX`: Address: Match & 9 Digit Zip: Match
        - `NYZ`: Address: No Match & 5 Digit Zip: Match
        - `NYW`: Address: No Match & 9 Digit Zip: Match
        - `YNA`: Address: Match & 5 Digit Zip: No Match
        - `NNN`: Address: No Match & 5 Digit Zip: No Match
        - `XXW`: Card Number Not On File
        - `XXU`: Address Information not verified for domestic transaction
        - `XXR`: Retry / System Unavailable
        - `XXS`: Service Not Supported
        - `XXE`: Address Verification Not Allowed For Card Type
        - `XXG`: Global Non-AVS participant
        - `YYG`: International Address: Match & Postal: Not Compatible
        - `GGG`: International Address: Match & Postal: Match
        - `YGG`: International Address: No Compatible & Postal: Match
        - `NNC`: International Address: Address not verified
        - `NA`: No AVS response (Typically no AVS data sent or swiped transaction)
    Cvv2ResultCode:
      type: string
      enum:
        - M
        - N
        - P
        - U
        - X
      description: |
        - `M`: Match
        - `N`: No Match
        - `P`: Not Processed
        - `U`: Issuer Not Certified
        - `X`: No response from association
        - `null`: No CVV2/CVC data available for transaction.
    CreditCardResponseFields:
      type: object
      properties:
        avs_result:
          type: string
        avs_result_code:
          $ref: '#/components/schemas/AvsResultCode'
        cvv2_result:
          type: string
        cvv2_result_code:
          $ref: '#/components/schemas/Cvv2ResultCode'
        card_type:
          type: string
        last_4:
          type: string
    ReferenceNumber:
      type: object
      properties:
        reference_number:
          type: integer
          description: Reference number for the new transaction. This can be used to reference the transaction later on.
          minimum: 1
    BaseResponse:
      type: object
      properties:
        version:
          type: string
          description: Version number of the API.
        status:
          $ref: '#/components/schemas/Result'
        status_code:
          $ref: '#/components/schemas/ResultCode'
        error_message:
          type: string
          description: This can be an error message for validation errors, or an error message returned by the processor.
        error_code:
          type: string
          description: This can be an error code for validation errors, or an error code returned by the processor.
        error_details:
          description: |
            This is for details about the error.
            For schema validation errors, this can be an object whose keys are the field names with invalid data,
            and the values are an array of issues.
          oneOf:
            - type: string
            - type: object
    AdjustCaptureResponse:
      allOf:
        - $ref: '#/components/schemas/BaseResponse'
        - type: object
          properties:
            auth_amount:
              type: number
              description: Final amount that was authorized by the processor.
            auth_code:
              type: string
              description: Authorization code returned by the processor. This will not be sent for a Decline or Error.
    BaseChargeResponse:
      allOf:
        - $ref: '#/components/schemas/AdjustCaptureResponse'
        - $ref: '#/components/schemas/ReferenceNumber'
        - type: object
          properties:
            transaction:
              type: object
              $ref: '#/components/schemas/CheckTransaction'
    CreditCardResponse:
      title: Credit Card Response
      allOf:
        - $ref: '#/components/schemas/BaseChargeResponse'
        - $ref: '#/components/schemas/CreditCardResponseFields'
        - type: object
          properties:
            card_ref:
              type: string
              pattern: '^[A-Z]{2}[A-Z0-9]{14}$'
              description: |
                A card token that can be used for a Source request, instead of the card number.
                This will be returned if `save_card` was set to `true`.
            card_type:
              type: string
              enum: [Visa, MasterCard, Discover, Amex, JCB, Diners]
            last_4:
              type: string
              description: Last 4 digits of the card number.
              pattern: '^\d{4}$'
            transaction:
              type: object
              $ref: '#/components/schemas/CardTransaction'
    VoidResponse:
      $ref: '#/components/schemas/BaseResponse'
    RefundResponse:
      allOf:
        - $ref: '#/components/schemas/BaseResponse'
        - $ref: '#/components/schemas/ReferenceNumber'
    ReversalResponse:
      oneOf:
        - allOf:
            - $ref: '#/components/schemas/VoidResponse'
            - type: object
              properties:
                type:
                  type: string
                  enum:
                    - Void
          title: Response for Void
        - allOf:
            - $ref: '#/components/schemas/RefundResponse'
            - type: object
              properties:
                type:
                  type: string
                  enum:
                    - Refund
          title: Response for Refund
        - allOf:
            - $ref: '#/components/schemas/AdjustCaptureResponse'
            - type: object
              properties:
                type:
                  type: string
                  enum:
                    - Adjustment
          title: Response for Adjust
    VerificationResponse:
      allOf:
        - $ref: '#/components/schemas/BaseResponse'
        - $ref: '#/components/schemas/CreditCardResponseFields'
        - type: object
          properties:
            card_ref:
              type: string
              pattern: '^[A-Z]{2}[A-Z0-9]{14}$'
              description: A card token that can be used in the place of the card number. This will be returned if `save_card` was set to `true`.
            transaction:
              type: object
              $ref: '#/components/schemas/CardTransaction'
    CreateSavedCardResponse:
      type: object
      properties:
        cardRef:
          description: A token representing the submitted card.
          type: string
          minLength: 16
          maxLength: 16
    UpdateSavedCardResonse:
      allOf:
        - $ref: '#/components/schemas/UpdateSavedCard'
        - type: object
          properties:
            cardRef:
              description: A token representing the submitted card.
              type: string
    BaseTransaction:
      allOf:
        - type: object
          properties:
            id:
              type: integer
              description: The ID (reference number) of the transaction.
              minimum: 1
            created_at:
              type: string
              format: 'date-time'
              description: The time the transaction was run.
            settled_date:
              type: string
              format: 'date'
              description: The date in UTC that the transaction was settled.
            amount_details:
              type: object
              properties:
                amount:
                  type: number
                  description: Transaction amount in USD.
                  minimum: 0.01
                tax:
                  type: number
                  minimum: 0
                  description: Amount of `amount` field that is for tax.
                tax_percent:
                  type: number
                  minimum: 0
                  description: The tax percentage that is applied to `subtotal - discount`.
                surcharge:
                  type: number
                  minimum: 0
                  description: Amount of `amount` field that is for surcharge.
                shipping:
                  type: number
                  minimum: 0
                  description: Amount of `amount` field that is for shipping.
                tip:
                  type: number
                  minimum: 0
                  description: Amount of `amount` field that is for a tip.
                discount:
                  type: number
                  minimum: 0
                  description: Amount of discount that was applied.
                subtotal:
                  type: number
                  description: |
                    The subtotal before the tax, surcharge, shipping, tip, and discount.
                    If not provided, this field will be automatically calculated.
                    If a mandatory surcharge is set by the ISO/MSP, this could be different than `original_requested_amount`.
            transaction_details:
              allOf:
                - $ref: '#/components/schemas/BaseTransactionDetails'
                - $ref: '#/components/schemas/ExtendedTransactionDetails'
                - type: object
                  description: Additional optional transaction details.
                  properties:
                    batch_id:
                      type: integer
                      minimum: 1
                      description: The ID of the batch that this transaction is in. This does not apply to check or non-captured transactions.
                    source:
                      type: string
                      description: The name of the source key used to process this transaction.
                    terminal_name:
                      type: string
                      description: The name of the terminal device that processed this transaction.
                    terminal_id:
                      type: string
                      description: The ID of the terminal device that processed this transaction.
                    username:
                      type: string
                      description: The user that processed this transaction, if it was processed in the gateway.
                    type:
                      type: string
                      enum: [charge, credit]
                      description: The transaction type.
                    reference_number:
                      type: integer
                      description: The reference number of an earlier transaction referenced by this one (e.g. a refund).
                      minimum: 1
                    schedule_id:
                      type: integer
                      description: The ID of the recurring schedule that this transaction is attached to.
            customer:
              type: object
              properties:
                identifier:
                  type: string
                  maxLength: 255
                  description: Something that identifies the customer, e.g. the customer's name or company.
                email:
                  type: string
                  format: emails
                  maxLength: 255
                fax:
                  type: string
                  maxLength: 255
                customer_id:
                  type: integer
                  minimum: 1
            status_details:
              type: object
              properties:
                error_code:
                  type: string
                error_message:
                  type: string
                status:
                  type: string
                  enum: [captured, pending, reserve, originated, returned, cancelled, queued, declined, error, settled, voided, approved, blocked, unknown]
                  description: The current status of the transaction.
            billing_info:
              $ref: '#/components/schemas/Address'
            shipping_info:
              $ref: '#/components/schemas/Address'
            custom_fields:
              $ref: '#/components/schemas/CustomFields'
    Transaction:
      oneOf:
        - $ref: '#/components/schemas/CardTransaction'
        - $ref: '#/components/schemas/CheckTransaction'
    CardTransaction:
      title: Credit Card Transaction
      allOf:
        - $ref: '#/components/schemas/BaseTransaction'
        - $ref: '#/components/schemas/CardDetails'
        - type: object
          properties:
            amount_details:
              type: object
              properties:
                original_requested_amount:
                  type: number
                  minimum: 0.01
                  description: The amount that was originally requested to be authorized.
                original_authorized_amount:
                  type: number
                  minimum: 0.01
                  description: |
                    The amount that was originally authorized.
                    If the transaction was partially approved, this could be different than the `original_requested_amount` field.
                    If the transaction was adjusted, the `amount` field could be different than this field.
    CheckTransaction:
      title: Check Transaction
      allOf:
        - $ref: '#/components/schemas/BaseTransaction'
        - $ref: '#/components/schemas/CheckDetails'
    CardDetails:
      type: object
      properties:
        card_details:
          type: object
          properties:
            name:
              type: string
              description: Name on card
              maxLength: 255
            last4:
              type: string
              minLength: 4
              maxLength: 4
            expiry_month:
              type: integer
              minimum: 1
              maximum: 12
            expiry_year:
              type: integer
              minimum: 2020
              maximum: 9999
            card_type:
              type: string
              enum: [Visa, Mastercard, Amex, Discover, Diners, JCB]
            avs_street:
              type: string
              maxLength: 255
            avs_zip:
              type: string
              maxLength: 9
            auth_code:
              type: string
            bin:
              type: string
              minLength: 6
              maxLength: 6
            bin_details:
              type: object
              properties:
                type:
                  type: string
                  enum: [C, D]
                  description: |
                    - `C`: Credit
                    - `D`: Debit
                    - `null`: Unknown / N/A
            avs_result:
              type: string
            avs_result_code:
              $ref: '#/components/schemas/AvsResultCode'
            cvv_result:
              type: string
            cvv_result_code:
              $ref: '#/components/schemas/Cvv2ResultCode'
            cavv_result:
              type: string
              description: This is the result message for the CAVV / SafeKey / SLI, depending on the card type.
            cavv_result_code:
              type: string
              description: This is the result code for the CAVV / SafeKey / SLI, depending on the card type.
    CheckDetails:
      type: object
      properties:
        check_details:
          type: object
          properties:
            name:
              type: string
              title: Name on the checking account.
              maxLength: 255
            routing_number:
              type: string
              description: Routing number
            account_number_last4:
              type: string
              description: Last 4 digits of the account number.
            account_type:
              type: string
              description: Account type
              enum: [checking, savings]
            sec_code:
              type: string
              description: SEC code
              enum: [PPD, CCD, TEL, WEB]
            returned_at:
              type: string
              format: 'date'
              description: The date in UTC the transaction was returned.
            returned_code:
              type: string
              description: The NACHA return reason code.
            returned_reason:
              type: string
              description: The reason the transaction was returned.
    SourceSurchargeRequest:
      type: object
      required:
        - source_type
        - source
      properties:
        source_type:
          type: string
          enum: [card, tkn, pm, ref]
          description: |
            * `card`: Card number
            * `tkn`: Token
            * `pm`: Payment method ID
            * `ref`: Reference number
        source:
          type: string
          pattern: '[A-Za-z0-9]+'
          maxLength: 16
          description: |
              The source to return the surcharge details for. This can be a card, a token, a payment method ID or the reference number of a previous transaction.

              For a source type of `card`, this does not need to be a full card number.
              However, the more digits that are sent, the more likely a match will be found.
    SourceSurchargeResponse:
      title: Credit Card Surcharge Details
      type: object
      properties:
        surcharge:
          type: object
          properties:
            type:
              type: string
              enum: [ percent, currency ]
              description: The surcharge fee type.
            value:
              type: integer
              minimum: 0
              description: The surcharge fee amount.
        bin_type:
          oneOf:
            - type: string
              enum: [C, D]
            - type: null
          description: |
            - `'C'`: Credit
            - `'D'`: Debit
            - `null`: Unknown / N/A
        payment_type:
          type: string
          enum: [ card, check ]
          description: |
              The payment type that the surcharge is for.

              This is useful if the payment type of the requested source is unknown.
    SurchargeSettingsResponse:
      type: object
      properties:
        card:
          type: object
          properties:
            type:
              type: string
              enum: [ percent, currency ]
              description: The surcharge fee type.
            value:
              type: integer
              minimum: 0
              description: The surcharge fee amount.
        check:
          type: object
          properties:
            type:
              type: string
              enum: [ percent, currency ]
              description: The surcharge fee type.
            value:
              type: integer
              minimum: 0
              description: The surcharge fee amount.
    Batch:
      type: object
      properties:
        id:
          type: integer
          minimum: 1
        opened_at:
          type: date-time
          description: The time the batch was opened.
        auto_close_date:
          type: date-time
          description: The time the batch is set to auto close, if any, or null if the batch is already closed.
        closed_at:
          type: date-time
          description: The time the batch was closed, or null if the batch is still open.
        platform:
          type: string
          enum: [north, nashville, amex]
          description: The platform that the batch is for.
        charges_sum:
          type: number
          minimum: 0.01
          description: The total sum of all approved charges in the batch.
        charges_count:
          type: integer
          minimum: 1
          description: The number of approved charges in the batch.
        credits_sum:
          type: number
          minimum: 0.01
          description: The total sum of all credits and refunds in the batch.
        credits_count:
          type: integer
          minimum: 1
          description: The number of credits and refunds in the batch.
        transactions_count:
          type: integer
          minimum: 1
          description: The number of transactions in the batch.
    BaseCustomer:
      type: object
      properties:
        identifier:
          type: string
          maxLength: 255
          description: Something that identifies the customer, e.g. the customer's name or company.
        customer_number:
          type: string
          maxLength: 255
          description: A custom identifier.
        first_name:
          type: string
          maxLength: 255
        last_name:
          type: string
          maxLength: 255
        email:
          type: string
          format: emails
          maxLength: 255
        website:
          type: string
          maxLength: 255
        phone:
          type: string
          maxLength: 50
        alternate_phone:
          type: string
          maxLength: 50
        billing_info:
          $ref: '#/components/schemas/Address'
        shipping_info:
          $ref: '#/components/schemas/Address'
        active:
          type: boolean
          default: true
        note:
          type: string
          maxLength: 750
    NewCustomer:
      allOf:
        - $ref: '#/components/schemas/BaseCustomer'
        - type: object
          required:
            - identifier
    NewCustomerFromTransaction:
      allOf:
        - $ref: '#/components/schemas/BaseCustomer'
        - type: object
          properties:
            reference_number:
              type: integer
              minimum: 1
              description: Reference number for the transaction.
            identifier:
              type: string
              maxLength: 255
              description: |
                Something that identifies the customer, e.g. the customer's name or company.
                This field is required if the transaction was not submitted with a customer identifier.
          required:
            - reference_number
    Customer:
      allOf:
        - $ref: '#/components/schemas/BaseCustomer'
        - type: object
          properties:
            id:
              type: integer
              minimum: 1
              description: The customer ID.
    BaseCreditCardPaymentMethod:
      title: Credit Card Payment Method
      allOf:
        - $ref: '#/components/schemas/AvsFields'
        - type: object
          properties:
            name:
              type: string
              description: The name on the account.
              maxLength: 255
            expiry_month:
              type: integer
              minimum: 1
              maximum: 12
            expiry_year:
              type: integer
              minimum: 2020
              maximum: 9999
    NewCreditCardPaymentMethod:
      title: Create Credit Card Payment Method
      allOf:
        - $ref: '#/components/schemas/BaseCreditCardPaymentMethod'
        - type: object
          required:
            - card
            - expiry_month
            - expiry_year
          properties:
            card:
              type: string
              pattern: '^\d+$'
              description: Card number
              minLength: 14
              maxLength: 16
    BaseDafCardPaymentMethod:
      title: DAF Card Payment Method
      allOf:
        - $ref: '#/components/schemas/AvsFields'
        - type: object
          properties:
            name:
              type: string
              description: The name on the account.
              maxLength: 255
            expiry_month:
              type: integer
              minimum: 1
              maximum: 12
            expiry_year:
              type: integer
              minimum: 2020
              maximum: 9999
    NewDafCardPaymentMethod:
      title: Create DAF Card Payment Method
      allOf:
        - $ref: '#/components/schemas/BaseDafCardPaymentMethod'
        - type: object
          required:
            - card
            - source
            - expiry_month
            - expiry_year
          properties:
            card:
              type: string
              pattern: '^\d+$'
              description: Card number
              minLength: 14
              maxLength: 16
            source:
                type: string
                enum: [pledger, donors_fund, ojc]
                description: The DAF Processor
    NewPaymentMethodFromSource:
      title: Create Payment Method From Source
      allOf:
        - $ref: '#/components/schemas/BaseCreditCardPaymentMethod'
        - $ref: '#/components/schemas/BaseCheckPaymentMethod'
        - type: object
          required:
            - source
          properties:
            source:
              type: string
              pattern: '(nonce|tkn|ref)-[A-Za-z0-9]+'
              description: |
                The source to create a payment method from. This can be a token, a nonce token or the reference number of a previous transaction.

                The appropriate prefix must be used:
                * Reference number: `ref-`<br/>
                  Any field provided in the body will override the data from the transaction.
                * Token: `tkn-`<br/>
                  Expiration fields are required.
                * Nonce token: `nonce-`<br/>
                  A one-time use token that is used to minimize PCI scope. Expiration fields are required.
              maxLength: 26
    BaseCheckPaymentMethod:
      title: Check Payment Method
      type: object
      properties:
        name:
          type: string
          description: The name on the account.
          maxLength: 255
        routing_number:
          type: string
          minLength: 9
          maxLength: 9
          pattern: '^\d+$'
        account_type:
          type: string
          enum: [checking, savings]
        sec_code:
          type: string
          enum: [PPD, CCD, TEL, WEB]
          description: Default SEC code.
    NewCheckPaymentMethod:
      title: Create Check Payment Method
      allOf:
        - $ref: '#/components/schemas/BaseCheckPaymentMethod'
        - type: object
          required:
            - name
            - routing_number
            - account_number
            - account_type
            - sec_code
          properties:
            account_number:
              type: string
              maxLength: 17
              pattern: '^\d+$'
              description: Bank account number
    BasePaymentMethod:
      type: object
      properties:
        id:
          type: integer
          minimum: 1
          description: Payment method ID.
        customer_id:
          type: integer
          minimum: 1
        created_at:
          type: string
          format: 'date-time'
    CreditCardPaymentMethod:
      title: Credit Card Payment Method
      allOf:
        - $ref: '#/components/schemas/BasePaymentMethod'
        - $ref: '#/components/schemas/BaseCreditCardPaymentMethod'
        - type: object
          properties:
            payment_method_type:
              type: string
              enum: [card]
            card_type:
              type: string
              enum: [Visa, MasterCard, Amex, Discover, JCB, Diners]
            bin:
              type: string
              minLength: 6
              maxLength: 6
              description: First 6 digits of the card number.
            bin_details:
              type: object
              properties:
                type:
                  type: string
                  enum: [ C, D ]
                  description: |
                    - `C`: Credit
                    - `D`: Debit
                    - `null`: Unknown / N/A
            last4:
              type: string
              minLength: 4
              maxLength: 4
              description: Last 4 digits of the card number.
    CheckPaymentMethod:
      title: Check Payment Method
      allOf:
        - $ref: '#/components/schemas/BasePaymentMethod'
        - $ref: '#/components/schemas/BaseCheckPaymentMethod'
        - type: object
          properties:
            payment_method_type:
              type: string
              enum: [check]
            last4:
              type: string
              minLength: 4
              maxLength: 4
              description: Last 4 digits of the account number.
    DafCardPaymentMethod:
      title: DAF Card Payment Method
      allOf:
        - $ref: '#/components/schemas/BasePaymentMethod'
        - $ref: '#/components/schemas/BaseCreditCardPaymentMethod'
        - type: object
          properties:
            payment_method_type:
              type: string
              enum: [ daf_card ]
            card_type:
              type: string
              enum: [ Donors Fund, Pledger, OJC]
            bin:
              type: string
              minLength: 6
              maxLength: 6
              description: First 6 digits of the card number.
            last4:
              type: string
              minLength: 4
              maxLength: 4
              description: Last 4 digits of the card number.
    Schedule:
      allOf:
        - $ref: '#/components/schemas/UpdateSchedule'
        - type: object
          properties:
            status:
              type: string
              enum: [active, declined, error, finished, failed]
              description: |
                This is the status of the schedule:
                * `active`: The schedule is active and will run on the `next_run_date`.
                * `declined`: The last transaction run by the schedule was declined.
                  If the schedule has not completed the set number of retries, it will retry the next day.
                * `error`: The last transaction run by the schedule failed with an error.
                  If the schedule has not completed the set number of retries, it will retry the next day.
                * `finished`: The schedule has finished the specified number of times to run.
                * `failed`: The schedule has completed the set number of retries after failing to run,
                  and will not retry again until the next time of the specified frequency (e.g. the next month).
            prev_run_date:
              type: string
              format: date
              description: The previous date in UTC that the schedule ran.
            transaction_count:
              type: integer
              description: This is the number of transactions processed by this schedule.
              minimum: 0
            id:
              type: integer
              minimum: 1
              description: Schedule ID
            customer_id:
              type: integer
              minimum: 1
              description: Customer ID
            created_at:
              type: string
              format: 'date-time'
    UpdateSchedule:
      type: object
      properties:
        title:
          type: string
          maxLength: 255
        frequency:
          type: string
          enum: [daily, weekly, biweekly, monthly, bimonthly, quarterly, biannually, annually]
          default: monthly
        amount:
          type: number
          minimum: 0.01
          maximum: 20000000
          description: |
            Amount to bill.

            If a mandatory surcharge is set by the ISO/MSP, the actual amount charged could be different than the amount submitted in this field.
        next_run_date:
          type: string
          format: date
          description: Next date (in EST) that the schedule will run. This must be after today's date. The default is tomorrow in EST.
        num_left:
          type: integer
          description: Number of times the schedule has left to bill. Set to `0` for ongoing.
          default: 0
          minimum: 0
        payment_method_id:
          type: integer
          minimum: 1
          description: Payment method ID
        active:
          type: boolean
          default: true
        receipt_email:
          type: string
          format: emails
          description: An email address to send a customer receipt to each time the schedule runs.
          maxLength: 255
    NewSchedule:
      allOf:
        - $ref: '#/components/schemas/UpdateSchedule'
        - type: object
          required:
            - title
            - amount
            - payment_method_id
          properties:
            use_this_source_key:
              type: boolean
              default: false
              description: |
                By default, recurring transactions use the `Recurring` source key.
                Set this field to `true` to use the source key that this request authenticated with.
    BaseCategory:
      type: object
      properties:
        name:
          type: string
          description: The name of the category.
        parent_id:
          oneOf:
            - type: 'integer'
            - type: 'null'
          default: null
          description: For subcategories, this field is the parent category ID.
    NewCategory:
      allOf:
        - $ref: '#/components/schemas/BaseCategory'
        - type: 'object'
          required:
            - name
    Category:
      allOf:
        - type: object
          properties:
            id:
              type: integer
              description: The category ID.
        - $ref: '#/components/schemas/BaseCategory'
    BaseProduct:
      type: object
      properties:
        enabled:
          type: boolean
          default: true
          description: If the product is currently enabled.
        name:
          type: string
          maxLength: 255
          description: The name of the product.
        manufacturer:
          type: string
          minLength: 1
          maxLength: 255
          description: The name of the manufacturer.
        model:
          type: string
          minLength: 1
          maxLength: 255
          description: The model name.
        sku:
          type: string
          minLength: 1
          maxLength: 255
          description: A SKU for the product.
        upc:
          type: string
          minLength: 1
          maxLength: 255
          description: A UPC for the product.
        weight:
          type: string
          minLength: 1
          maxLength: 255
          description: The product's weight.
        url:
          type: string
          minLength: 1
          maxLength: 255
          description: A web url for the product.
        description:
          type: string
          minLength: 1
          maxLength: 255
          description: The product description.
        price:
          type: number
          minimum: 0.0001
          maximum: 20000000
          description: The price of the product.
        category_id:
          type: integer
          description: The category that this product belongs in.
        enabled_from_date:
          type: string
          format: date
          description: The date that this product is available.
        ship_weight:
          type: string
          minLength: 1
          maxLength: 255
          description: The product's shipping weight.
        sale_price:
          type: number
          minimum: 0.0001
          maximum: 20000000
          description: The sale price of the product.
        quantity_on_hand:
          oneOf:
            - type: 'integer'
            - type: 'null'
          description: How many of this product still remains in stock. Set to `null` for unlimited.
        min_quantity:
          type: integer
          default: 1
          description: Minimum purchase quantity.
    NewProduct:
      allOf:
        - $ref: '#/components/schemas/BaseProduct'
        - type: 'object'
          required:
            - price
    Product:
      allOf:
        - type: object
          properties:
            id:
              type: integer
              description: The product ID.
            quantity_on_order:
              type: integer
              default: 0
              description: How many of this product has been ordered already.
            created_at:
              type: string
              format: 'date-time'
              description: The date and time this product was created.
        - $ref: '#/components/schemas/BaseProduct'
    GeneratePayLinkRequest:
      allOf:
        - $ref: '#/components/schemas/BasePayLink'
    PayLinkFieldObject:
      type: object
      properties:
        value:
          type: string
          maxLength: 255
        editable:
          type: boolean
          default: false
          description: Indicates whether the field is editable by the customer.
    PayLinkAddress:
      type: object
      properties:
        first_name:
          allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        last_name:
          allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        street:
          allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        state:
          allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        city:
          allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        zip_code:
          allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        country:
          allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
            - description: |
                    For the Country Blocker fraud module, use the 2-letter
                    [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) country code for best results.
        phone:
          allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
    PayLinkCustomFields:
      type: object
      properties:
        custom1:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom2:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom3:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom4:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom5:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom6:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom7:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom8:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom9:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom10:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom11:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom12:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom13:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom14:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom15:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom16:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom17:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom18:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom19:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
        custom20:
            allOf:
            - $ref: '#/components/schemas/PayLinkFieldObject'
    BasePayLink:
      type: object
      properties:
        general_fields:
          type: object
          properties:
            invoice:
              allOf:
                - $ref: '#/components/schemas/PayLinkFieldObject'
            company:
              allOf:
                - $ref: '#/components/schemas/PayLinkFieldObject'
            po:
              allOf:
                - $ref: '#/components/schemas/PayLinkFieldObject'
            email:
              allOf:
                - $ref: '#/components/schemas/PayLinkFieldObject'
            phone:
              allOf:
                - $ref: '#/components/schemas/PayLinkFieldObject'
            amount:
              type: object
              properties:
                value:
                  type: number
                  minimum: 0.01
                editable:
                  type: boolean
                  default: false
                  description: Indicates whether the field is editable by the customer.
            description:
              allOf:
                - $ref: '#/components/schemas/PayLinkFieldObject'
        billing_fields:
          allOf:
            - $ref: '#/components/schemas/PayLinkAddress'
        shipping_fields:
          allOf:
            - $ref: '#/components/schemas/PayLinkAddress'
        custom_fields:
          allOf:
            - $ref: '#/components/schemas/PayLinkCustomFields'
        send_to:
          type: object
          description: Where to send the pay link to.
          properties:
            emails:
              type: array
              items:
                type: string
                format: emails
              description: A list of email addresses to send the pay link to.
            sms:
              type: array
              items:
                type: string
              description: A list of phone numbers to send the pay link to via SMS.
        one_time_use:
          type: boolean
          default: false
          description: |
            Indicates whether the payment link should be single-use.
            When set to `true`, a unique tracking key is included in the response to monitor the payment status.
        redirect_url:
          type: string
          pattern: '^https:\/\/.*'
          description: |
            Optional URL to redirect the customer to after a successful payment.

            Query parameter `key=<key>` will be appended if `one_time_use` is set to `true`.
    BaseWebhook:
      type: object
      properties:
        webhook_url:
          type: string
          maxLength: 255
          description: The url of the webhook.
          pattern: '^https://'
        description:
          type: string
          minLength: 1
          maxLength: 255
          description: The webhook description.
        active:
          type: boolean
          default: true
          description: The status of the webhook
    NewWebhook:
      allOf:
        - $ref: '#/components/schemas/BaseWebhook'
        - type: object
          required:
            - webhook_url
    Webhook:
      allOf:
        - $ref: '#/components/schemas/BaseWebhook'
      type: object
      properties:
        id:
          type: integer
          description: The webhook ID
        signature:
          type: string
          description: The webhook signature used for validation
    AmountType:
      type: object
      required:
        - value
        - type
      properties:
        value:
          type: number
          description: A dollar amount or percentage.
          minimum: 0
        type:
          type: string
          enum: [percent, amount]
          description: Indicate if the value field is fixed amount or percentage.
    NewInvoiceProduct:
      type: object
      properties:
        product_id:
          oneOf:
            - type: 'integer'
            - type: 'null'
          default: null
          description: A product ID that product is linked to.
        name:
          oneOf:
            - type: 'string'
              maxLength: 255
            - type: 'null'
          description: The product name.
        description:
          oneOf:
            - type: 'string'
              maxLength: 255
            - type: 'null'
          description: |
            The product description.

            Can be omitted if product_id is set.
        price:
          type: number
          minimum: 0
          maximum: 20000000
          description: |
            The product price.

            Must be set if product_id is null.
        quantity:
          type: number
          description: The quantity of this product to add to the order.
          minimum: 0
          multipleOf: 0.0001
        taxable:
          type: boolean
          default: false
          description: Indicates if the product is taxable.
        tax:
          deprecated: true
          type: number
          minimum: 0
          maximum: 100
          description: |
            Deprecated. Use the `taxable` field to mark products as taxable and set the invoice `tax_percent` instead.

            An optional tax rate that is applied to the product price.
    InvoiceProduct:
      allOf:
        - type: object
          properties:
            id:
              type: integer
              description: The invoice product ID.
        - $ref: '#/components/schemas/NewInvoiceProduct'
        - type: object
          properties:
            surcharge:
              type: number
              description: A surcharge applied to the product.
            subtotal:
              type: number
              description: The subtotal for this product.
    BaseInvoice:
      type: object
      properties:
        customer_id:
          oneOf:
            - type: 'integer'
            - type: 'null'
          default: null
          description: The customer ID to send the invoice to. Can be NULL if customer is not saved.
        number:
          oneOf:
            - type: 'string'
              maxLength: 50
            - type: 'null'
          default: null
          description: |
            The invoice number. Can be alphanumeric.

            If set to NULL, will increment the highest numeric invoice number.
        customer_company:
          type: string
          maxLength: 255
          description: |
            The customer name.

            If invoice is linked to a customer and this field is omitted, it will be populated from the customer.
        customer_email:
          type: string
          maxLength: 255
          format: emails
          description: |
            The customer email.

            If invoice is linked to a customer and this field is omitted, it will be populated from the customer.
        billing_info:
          allOf:
            - $ref: '#/components/schemas/Address'
            - type: object
              description: |
                The customer billing info.

                If invoice is linked to a customer and this field is omitted, it will be populated from the customer.
        shipping_info:
          allOf:
            - $ref: '#/components/schemas/Address'
            - type: object
              description: |
                The customer shipping info.

                If invoice is linked to a customer and this field is omitted, it will be populated from the customer.
        date:
          type: string
          format: date
          description: |
            The invoice date.

            Defaults to today's date.
        due_date:
          type: string
          format: date
          description: |
            The date the invoice is due.

            Defaults to 30 days from invoice date.
        note:
          type: string
          description: A note to attach to the invoice.
        tax_percent:
          type: number
          minimum: 0
          maximum: 100
          description: The tax percent applied to all taxable products on the invoice.
        discount:
          allOf:
            - type: object
              $ref: '#/components/schemas/AmountType'
          description: Optional discount to apply to the invoice pre tax total.
        requirement:
          allOf:
            - type: object
              $ref: '#/components/schemas/AmountType'
            - type: object
              properties:
                value:
                  type: number
                  default: 100
                type:
                  type: string
                  default: percent
          required:
            - value
            - type
          description: Total amount that is required with first payment. Defaults to full due amount.
        surcharge:
          required:
            - card
            - ach
          type: object
          properties:
            card:
              type: object
              description: Surcharge for credit card payments.
              $ref: '#/components/schemas/AmountType'
            ach:
              type: object
              description: Surcharge for ach payments.
              $ref: '#/components/schemas/AmountType'
          description: An optional surcharge to be applied to card or ACH payments. This field will be overwritten if the ISO/MSP sets a mandatory surcharge.
        terms:
          type: string
          description: Additional terms to attach to the invoice.
        action:
          type: string
          default: "charge"
          enum: [charge, authorize]
          description: The action to process the invoice.
    NewInvoice:
      required:
        - products
      allOf:
        - $ref: '#/components/schemas/BaseInvoice'
        - type: object
          properties:
            products:
              type: array
              items:
                type: object
                $ref: '#/components/schemas/NewInvoiceProduct'
              description: A list of products in the invoice.
            send_invoice:
              type: boolean
              default: false
              description: Flag to send invoice to immediately send invoice to customer for payment. Set to false to save a draft.
            email_info:
              type: object
              $ref: '#/components/schemas/InvoiceEmailInfo'
    Invoice:
      allOf:
        - type: object
          properties:
            id:
              type: integer
              description: The invoice ID.
            status:
              type: string
              enum: [canceled,paid,partially paid,sent,viewed,authorized,saved]
              description: The current status of this invoice.
            to_email:
              type: string
              description: A comma delimited list of email addresses that this invoice was sent to.
            sub_total_amount:
              type: number
              description: A calculated sub total of the invoice before tax and surcharges.
            total_amount:
              type: number
              description: The total dollar amount of the invoice after tax (without surcharge).
            due_amount:
              type: number
              description: The amount still unpaid.
            paid_amount:
              type: number
              description: The total amount paid.
            tax:
              type: number
              description: The calculated tax amount.
            created_at:
              type: string
              format: date-time
              description: The date this invoice was created. May differ from date field.
            products:
              type: array
              items:
                type: object
                $ref: '#/components/schemas/InvoiceProduct'
              description: A list of products in the invoice.
            payment_link:
              type: string
              description: A generated url used to pay the invoice
        - $ref: '#/components/schemas/BaseInvoice'
    InvoiceEmailInfo:
      type: object
      description: An object containing information related to sending a customer invoice.
      properties:
        body:
          type: string
          default: "Dear {customer_name},\n\nPlease see the Invoice {invoice_number} attached."
          description: |
            An email body.

            The default value will fill in the templated fields.
            If you supply a body text, it will be sent exactly as supplied without any parsing.
            However, you can add special escape characters such as `\n` for new-line
        subject:
          type: string
          default: Invoice {invoice_number} from {merchant_company}
          description: |
            The email subject.

            The default value will fill in the templated fields.
            If you supply a subject text, it will be sent exactly as supplied without any parsing.
        to:
          type: array
          items:
            type: string
            format: emails
          description: |
            A list of email addresses to send to.
            If not supplied, it will be populated from the `customer_email` field.
        sms_number:
          type: array
          items:
            type: string
          description: A list of numbers to send an sms to.
        attach_invoice:
          type: boolean
          default: true
          description: Specify if system invoice should be attached to the email.
```