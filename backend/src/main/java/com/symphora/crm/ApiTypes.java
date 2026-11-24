package com.symphora.crm;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class ApiTypes {
    private ApiTypes() {}

    public record Tag(long id, String name, String color) {}
    public record TagInput(@NotBlank @Size(max=80) String name,
                           @Pattern(regexp="^#[0-9a-fA-F]{6}$") String color) {}

    public record Customer(long id, String name, String phone, String email,
                           String source, String location, String notes,
                           boolean marketingConsent, String consentSource, Instant consentAt,
                           boolean optedOut, Instant createdAt, List<Tag> tags) {}
    public record CustomerInput(
        @NotBlank @Size(max=160) String name,
        @NotBlank String phone,
        @Email @Size(max=254) String email,
        @Size(max=100) String source,
        @Size(max=100) String location,
        @Size(max=3000) String notes,
        Boolean marketingConsent,
        @Size(max=140) String consentSource,
        Boolean optedOut) {}

    public record Deal(long id, long customerId, String customerName, String product,
                       String stage, BigDecimal amount, LocalDate followUpAt,
                       String notes, Instant createdAt) {}
    public record DealInput(@NotNull Long customerId,
                            @NotBlank @Size(max=160) String product,
                            String stage, @DecimalMin("0.0") BigDecimal amount,
                            LocalDate followUpAt, @Size(max=3000) String notes) {}
    public record StageInput(@NotBlank String stage) {}

    public record Activity(long id, long customerId, String body, Instant createdAt) {}
    public record ActivityInput(@NotBlank @Size(max=2000) String body) {}

    public record Sms(long id, long customerId, String body, String purpose,
                      String status, String providerMessageId, String errorMessage, Instant createdAt) {}
    public record SmsInput(@NotNull Long customerId, @NotBlank @Size(max=800) String body,
                           @NotBlank String purpose, @NotNull UUID requestId,
                           boolean confirmed) {}
}
