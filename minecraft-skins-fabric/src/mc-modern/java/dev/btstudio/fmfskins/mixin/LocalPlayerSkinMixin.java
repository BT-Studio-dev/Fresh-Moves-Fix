package dev.btstudio.fmfskins.mixin;

import dev.btstudio.fmfskins.SkinStore;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.AbstractClientPlayerEntity;
import net.minecraft.client.util.SkinTextures;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Replace only the local skin while retaining the account cape and elytra. */
@Mixin(AbstractClientPlayerEntity.class)
public abstract class LocalPlayerSkinMixin {
    @Inject(method = "getSkinTextures", at = @At("RETURN"), cancellable = true)
    private void fmf$skinTexture(CallbackInfoReturnable<SkinTextures> result) {
        MinecraftClient client = MinecraftClient.getInstance();
        if ((Object) this != client.player || SkinStore.texture() == null) return;
        SkinTextures old = result.getReturnValue();
        result.setReturnValue(new SkinTextures(SkinStore.texture(), null, old.capeTexture(), old.elytraTexture(),
                SkinStore.isSlim() ? SkinTextures.Model.SLIM : SkinTextures.Model.WIDE, old.secure()));
    }
}
