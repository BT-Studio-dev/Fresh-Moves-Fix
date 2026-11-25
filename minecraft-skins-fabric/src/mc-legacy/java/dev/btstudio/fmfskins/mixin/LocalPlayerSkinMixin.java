package dev.btstudio.fmfskins.mixin;

import dev.btstudio.fmfskins.SkinStore;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.AbstractClientPlayerEntity;
import net.minecraft.util.Identifier;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Only the local client player is changed; no network packets or account uploads. */
@Mixin(AbstractClientPlayerEntity.class)
public abstract class LocalPlayerSkinMixin {
    @Inject(method = "getSkinTexture", at = @At("HEAD"), cancellable = true)
    private void fmf$skinTexture(CallbackInfoReturnable<Identifier> result) {
        MinecraftClient client = MinecraftClient.getInstance();
        if ((Object) this == client.player && SkinStore.texture() != null) {
            result.setReturnValue(SkinStore.texture());
        }
    }

    @Inject(method = "getModel", at = @At("HEAD"), cancellable = true)
    private void fmf$model(CallbackInfoReturnable<String> result) {
        MinecraftClient client = MinecraftClient.getInstance();
        if ((Object) this == client.player && SkinStore.texture() != null) {
            result.setReturnValue(SkinStore.isSlim() ? "slim" : "default");
        }
    }
}
