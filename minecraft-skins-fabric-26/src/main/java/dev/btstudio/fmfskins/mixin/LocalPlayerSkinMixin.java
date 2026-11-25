package dev.btstudio.fmfskins.mixin;

import dev.btstudio.fmfskins.SkinStore;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.core.ClientAsset;
import net.minecraft.world.entity.player.PlayerModelType;
import net.minecraft.world.entity.player.PlayerSkin;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Local-only override; preserve the original cape and elytra. */
@Mixin(AbstractClientPlayer.class)
public abstract class LocalPlayerSkinMixin {
    @Inject(method = "getSkin", at = @At("RETURN"), cancellable = true)
    private void fmf$skinTexture(CallbackInfoReturnable<PlayerSkin> result) {
        Minecraft client = Minecraft.getInstance();
        if ((Object) this != client.player || SkinStore.texture() == null) return;
        PlayerSkin old = result.getReturnValue();
        ClientAsset.Texture body = new ClientAsset.ResourceTexture(SkinStore.texture(), SkinStore.texture());
        result.setReturnValue(new PlayerSkin(body, old.cape(), old.elytra(),
                SkinStore.isSlim() ? PlayerModelType.SLIM : PlayerModelType.WIDE, old.secure()));
    }
}
