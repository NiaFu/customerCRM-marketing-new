package com.symphora.crm;

import static com.symphora.crm.ApiTypes.*;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/sms")
public class SmsController {
    private final CrmStore store;
    private final RestClient client;
    private final String mode;
    private final String apiUsername;
    private final String apiKey;
    private final String from;

    public SmsController(CrmStore store,
        @Value("${app.sms.mode}") String mode,
        @Value("${app.sms.clicksend-username}") String apiUsername,
        @Value("${app.sms.clicksend-api-key}") String apiKey,
        @Value("${app.sms.from}") String from,
        RestClient.Builder builder) {
        this.store=store;
        this.client=builder.baseUrl("https://rest.clicksend.com/v3").build();
        this.mode=mode;
        this.apiUsername=apiUsername;
        this.apiKey=apiKey;
        this.from=from;
    }

    @PostMapping("/send")
    public Sms send(@Valid @RequestBody SmsInput input) {
        if (!input.confirmed()) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,"Explicit send confirmation is required");

        // The stable request ID is reused on retry; never send twice with the same ID.
        var previous=store.smsByRequest(input.requestId());
        if (previous.isPresent()) {
            if(previous.get().customerId()!=input.customerId() ||
               !previous.get().body().equals(input.body().trim()) ||
               !previous.get().purpose().equals(input.purpose())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Request ID belongs to another SMS");
            }
            return previous.get();
        }

        var customer=store.customer(input.customerId());
        if (!Set.of("MARKETING","SERVICE").contains(input.purpose())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Purpose must be MARKETING or SERVICE");
        }
        if (input.purpose().equals("MARKETING") &&
            (!customer.marketingConsent() || customer.optedOut())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Marketing message blocked: customer has not consented or has opted out");
        }

        if (!Set.of("preview","clicksend").contains(mode)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Invalid SMS_MODE");
        }
        if (mode.equals("clicksend") && (apiUsername.isBlank() || apiKey.isBlank())) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "ClickSend credentials are not configured");
        }

        Sms pending=store.addSms(customer.id(),input.requestId(),input.body(),input.purpose());
        if (mode.equals("preview")) return store.updateSms(pending.id(),"PREVIEW",null,null);

        try {
            Map<String,Object> sms=new LinkedHashMap<>();
            sms.put("to",customer.phone());
            sms.put("body",input.body().trim());
            sms.put("source","customer-crm");
            if(!from.isBlank()) sms.put("from",from);

            JsonNode response=client.post().uri("/sms/send")
                .headers(h -> h.setBasicAuth(apiUsername,apiKey))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("messages",List.of(sms)))
                .retrieve().body(JsonNode.class);

            if (response==null || !response.path("response_code").asText().equals("SUCCESS")
                || response.path("data").path("queued_count").asInt(0)<1) {
                String reason=response==null ? "No provider response"
                    : response.path("response_msg").asText("Provider rejected message");
                return store.updateSms(pending.id(),"FAILED",null,reason);
            }
            JsonNode first=response.path("data").path("messages").path(0);
            return store.updateSms(pending.id(),"QUEUED",
                first.path("message_id").asText(null),null);
        } catch (RestClientException ex) {
            // A timeout may mean the provider accepted the message. Do NOT auto-retry.
            return store.updateSms(pending.id(),"UNKNOWN",null,
                "Provider response unavailable. Check ClickSend before retrying.");
        }
    }
}
