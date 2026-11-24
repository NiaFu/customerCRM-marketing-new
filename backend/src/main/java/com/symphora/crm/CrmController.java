package com.symphora.crm;

import static com.symphora.crm.ApiTypes.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CrmController {
    private final CrmStore store;
    private final String username;
    private final String smsMode;

    public CrmController(CrmStore store,
        @Value("${app.admin.username}") String username,
        @Value("${app.sms.mode}") String smsMode) {
        this.store=store; this.username=username; this.smsMode=smsMode;
    }

    @GetMapping("/me")
    public Map<String,String> me() {
        return Map.of("username",username,"smsMode",smsMode);
    }

    @GetMapping("/customers")
    public List<Customer> customers(@RequestParam(required=false) String q,
                                    @RequestParam(required=false) Long tagId) {
        return store.customers(q,tagId);
    }

    @GetMapping("/customers/{id}")
    public Customer customer(@PathVariable long id) { return store.customer(id); }

    @PostMapping("/customers")
    @ResponseStatus(HttpStatus.CREATED)
    public Customer createCustomer(@Valid @RequestBody CustomerInput in) {
        return store.createCustomer(in);
    }

    @PutMapping("/customers/{id}")
    public Customer updateCustomer(@PathVariable long id,@Valid @RequestBody CustomerInput in) {
        return store.updateCustomer(id,in);
    }

    @GetMapping("/tags")
    public List<Tag> tags() { return store.tags(); }

    @PostMapping("/tags")
    @ResponseStatus(HttpStatus.CREATED)
    public Tag createTag(@Valid @RequestBody TagInput in) { return store.createTag(in); }

    @DeleteMapping("/tags/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTag(@PathVariable long id) { store.deleteTag(id); }

    @PostMapping("/customers/{cid}/tags/{tid}")
    public Customer assignTag(@PathVariable long cid,@PathVariable long tid) {
        return store.assignTag(cid,tid);
    }

    @DeleteMapping("/customers/{cid}/tags/{tid}")
    public Customer unassignTag(@PathVariable long cid,@PathVariable long tid) {
        return store.unassignTag(cid,tid);
    }

    @GetMapping("/deals")
    public List<Deal> deals() { return store.deals(); }

    @PostMapping("/deals")
    @ResponseStatus(HttpStatus.CREATED)
    public Deal createDeal(@Valid @RequestBody DealInput in) { return store.createDeal(in); }

    @PatchMapping("/deals/{id}/stage")
    public Deal moveDeal(@PathVariable long id,@Valid @RequestBody StageInput in) {
        return store.updateStage(id,in.stage());
    }

    @GetMapping("/customers/{id}/activities")
    public List<Activity> activities(@PathVariable long id) { return store.activities(id); }

    @PostMapping("/customers/{id}/activities")
    @ResponseStatus(HttpStatus.CREATED)
    public Activity activity(@PathVariable long id,@Valid @RequestBody ActivityInput in) {
        return store.addActivity(id,in.body());
    }

    @GetMapping("/customers/{id}/sms")
    public List<Sms> sms(@PathVariable long id) { return store.messages(id); }
}
